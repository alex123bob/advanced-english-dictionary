#!/usr/bin/env python3
"""Maintain a rolling 30-day WOTD schedule with dedup."""

import json
import os
from datetime import datetime, timedelta, timezone

SCHEDULE_PATH = 'data/wotd-schedule.json'
MIN_PENDING = 30
WORD_POOL = [
    'serendipity', 'ubiquitous', 'ephemeral', 'pipe',
]
POOL_FILE = 'data/wotd-word-pool.json'
SKIPPED_REUSE_DAYS = 90


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def today_str():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def main():
    schedule = load_json(SCHEDULE_PATH)

    pool = load_json(POOL_FILE) if os.path.exists(POOL_FILE) else WORD_POOL

    existing_words = {e['word'].lower() for e in schedule}

    today = today_str()

    pending = [e for e in schedule if e['status'] == 'pending']

    for entry in schedule:
        if entry['status'] == 'pending' and entry['date'] <= today:
            entry['status'] = 'published'
            entry['published_at'] = datetime.now(timezone.utc).isoformat()

    pending = [e for e in schedule if e['status'] == 'pending']
    needed = MIN_PENDING - len(pending)

    if needed > 0:
        import random
        from datetime import datetime, timedelta, timezone

        today_dt = datetime.now(timezone.utc)
        cooldown_cutoff = today_dt - timedelta(days=SKIPPED_REUSE_DAYS)

        skipped_in_cooldown = {
            e['word'].lower()
            for e in schedule
            if e['status'] == 'skipped'
            and e.get('published_at')
            and datetime.fromisoformat(e['published_at']) > cooldown_cutoff
        }

        candidates = [w for w in pool if w.lower() not in existing_words]

        available = [w for w in candidates if w.lower() not in skipped_in_cooldown]

        random.shuffle(available)

        last_date = max(
            (e['date'] for e in schedule if e.get('date')),
            default=today
        )

        for i in range(min(needed, len(available))):
            word = available[i]
            last_date = (datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
            schedule.append({
                'word': word,
                'date': last_date,
                'status': 'pending',
                'difficulty': None,
                'category': None
            })

    save_json(SCHEDULE_PATH, schedule)
    print(f'Schedule updated. Total entries: {len(schedule)}')


if __name__ == '__main__':
    main()
