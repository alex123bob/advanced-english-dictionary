#!/usr/bin/env python3
"""Maintain a rolling 30-day WOTD schedule with dedup."""

import json
import os
import random
from datetime import datetime, timedelta, timezone

SCHEDULE_PATH = 'data/wotd-schedule.json'
MIN_PENDING = 30
WORD_POOL = [
    'serendipity', 'ubiquitous', 'ephemeral', 'pipe',
]
POOL_FILE = 'data/wotd-word-pool.json'
# Published words cannot be reused within this many days
PUBLISHED_REUSE_DAYS = 180
# Skipped words cannot be reused within this many days
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

    today = today_str()
    now = datetime.now(timezone.utc)

    # Normalize all entries to have consistent keys
    for entry in schedule:
        entry.setdefault('published_at', None)

    # Mark pending entries whose date has arrived as published
    for entry in schedule:
        if entry['status'] == 'pending' and entry['date'] <= today:
            entry['status'] = 'published'
            entry['published_at'] = now.isoformat()

    pending = [e for e in schedule if e['status'] == 'pending']
    needed = MIN_PENDING - len(pending)

    if needed > 0:
        published_cutoff = now - timedelta(days=PUBLISHED_REUSE_DAYS)
        skipped_cutoff = now - timedelta(days=SKIPPED_REUSE_DAYS)

        # Words already in the pending queue must not be scheduled again
        already_pending = {e['word'].lower() for e in pending}

        # Recently published words are on cooldown
        recently_published = {
            e['word'].lower()
            for e in schedule
            if e['status'] == 'published'
            and e.get('published_at')
            and datetime.fromisoformat(e['published_at']) > published_cutoff
        }

        # Recently skipped words are on cooldown
        recently_skipped = {
            e['word'].lower()
            for e in schedule
            if e['status'] == 'skipped'
            and e.get('published_at')
            and datetime.fromisoformat(e['published_at']) > skipped_cutoff
        }

        blocked = already_pending | recently_published | recently_skipped
        available = [w for w in pool if w.lower() not in blocked]
        random.shuffle(available)

        last_date = max(
            (e['date'] for e in schedule if e.get('date')),
            default=today
        )

        for word in available[:needed]:
            last_date = (
                datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)
            ).strftime('%Y-%m-%d')
            schedule.append({
                'word': word,
                'date': last_date,
                'status': 'pending',
                'published_at': None,
                'difficulty': None,
                'category': None,
            })

    save_json(SCHEDULE_PATH, schedule)
    print(f'Schedule updated. Total entries: {len(schedule)}, pending: {len([e for e in schedule if e["status"] == "pending"])}')


if __name__ == '__main__':
    main()
