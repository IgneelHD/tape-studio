// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Offline or no release yet: just keep running the current version.
                if let Err(e) = check_for_update(app).await {
                    eprintln!("update check failed: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Tape Studio");
}

async fn check_for_update(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
    };
    let text = format!(
        "Доступна новая версия Tape Studio {} (у вас {}).\n\nСохраните проект: при обновлении приложение перезапустится.",
        update.version, update.current_version
    );
    // Ask first: installing closes the app and would lose unsaved edits.
    let handle = app.clone();
    app.dialog()
        .message(text)
        .title("Обновление")
        .buttons(MessageDialogButtons::OkCancelCustom("Обновить".into(), "Позже".into()))
        .show(move |accepted| {
            if !accepted {
                return;
            }
            tauri::async_runtime::spawn(async move {
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => handle.restart(),
                    Err(e) => {
                        handle
                            .dialog()
                            .message(format!("Не удалось обновить: {e}"))
                            .title("Обновление")
                            .show(|_| {});
                    }
                }
            });
        });
    Ok(())
}
