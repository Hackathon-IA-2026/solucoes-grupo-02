import logging
from datetime import datetime
from pathlib import Path
import shutil
import requests

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")


def store_file(
    source_file_path: str | Path,
    shared_directory: str | Path = "/app/storage",
    target_file_name: str | None = None,
) -> Path | None:
    """
    Handles moving a file to a date-partitioned structure in the shared volume.
    Single Responsibility: File Storage Management.
    """
    source_path = Path(source_file_path)

    if not source_path.is_file():
        logging.error(f"Source file not found: {source_file_path}")
        return None

    file_name = target_file_name or source_path.name

    now = datetime.now()
    target_dir = Path(shared_directory) / f"{now.year}/{now.month:02d}/{now.day:02d}"
    
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        final_target_path = target_dir / file_name

        logging.debug(f"Moving file: '{source_path}' -> '{final_target_path}'")
        shutil.move(str(source_path), str(final_target_path))
        
        logging.info(f"File stored successfully at: '{final_target_path}'")
        return final_target_path

    except Exception as e:
        logging.error(f"Failed to store file in shared directory: {e}")
        return None


def notify_api(
    api_url: str,
    file_path: Path,
    headers: dict | None = None,
    timeout: int = 15,
) -> bool:
    """
    Handles HTTP notification to the external API using JSON payload.
    Single Responsibility: Network / API Communication.
    """
    payload = {
        "csv_file": str(file_path),
        "generation_date": datetime.now().isoformat(),
    }

    logging.debug(f"Notifying API at {api_url}...")
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=timeout)
        logging.debug(f"API Response: {response.text}")
        
        response.raise_for_status()

        if response.status_code != 200:
            logging.error(f"API returned non-200 status code: {response.status_code}")
            return False

        logging.info("API notified successfully.")
        return True

    except requests.exceptions.RequestException as err:
        logging.error(f"Failed to notify API: {err}")
        return False
    except Exception as err:
        logging.error(f"Unexpected error during API notification: {err}")
        return False


def store_and_notify_api(
    temp_csv_path: str | Path,
    api_url: str,
    shared_directory: str | Path = "/app/storage",
    file_name: str | None = None,
    headers: dict | None = None,
    timeout: int = 15,
) -> bool:
    stored_file_path = store_file(
        source_file_path=temp_csv_path,
        shared_directory=shared_directory,
        target_file_name=file_name,
    )

    if not stored_file_path:
        return False

    return notify_api(
        api_url=api_url,
        file_path=stored_file_path,
        headers=headers,
        timeout=timeout,
    )


if __name__ == "__main__":
    TEMP_FILE_PATH = "./current_processing_data.csv"
    API_ENDPOINT = "http://api:3000/api/process-csv"

    success = store_and_notify_api(
        temp_csv_path=TEMP_FILE_PATH,
        api_url=API_ENDPOINT,
    )