#!/usr/bin/env python3
"""Continue overnight: splice + oversize only."""
import os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import overnight_roboflow_train as ot

ot.JOBS = [j for j in ot.JOBS if j["task"] in ("splice", "oversize")]
sys.exit(ot.main())
