from datetime import datetime
from typing import Optional

_simulated_time: Optional[datetime] = None

def set_simulated_time(dt: Optional[datetime]):
    global _simulated_time
    _simulated_time = dt

def get_current_time() -> datetime:
    if _simulated_time:
        return _simulated_time
    return datetime.utcnow()

def clear_simulated_time():
    global _simulated_time
    _simulated_time = None
