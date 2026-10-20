// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![app_version, check_update])
        .setup(|app| {
            let app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Offline or no release yet: just keep running the current version.
                if let Err(e) = check_for_update(app, false).await {
                    eprintln!("update check failed: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Tape Studio");
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Manual check from the About section: always tells the user the outcome.
#[tauri::command]
async fn check_update(app: AppHandle) {
    if let Err(e) = check_for_update(app.clone(), true).await {
        notify(&app, format!("Не удалось проверить обновления: {e}"));
    }
}

fn notify(app: &AppHandle, text: String) {
    app.dialog().message(text).title("Обновление").show(|_| {});
}

async fn check_for_update(app: AppHandle, manual: bool) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        if manual {
            let version = app.package_info().version.to_string();
            notify(&app, format!("У вас последняя версия Tape Studio ({version})."));
        }
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
                    Err(e) => notify(&handle, format!("Не удалось обновить: {e}")),
                }
            });
        });
    Ok(())
}
