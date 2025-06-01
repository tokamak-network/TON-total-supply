#!/usr/bin/env python3
"""
TON 특정 이벤트 기간 확대 분석
"""

import csv
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import numpy as np

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

def load_all_data():
    """모든 데이터 로드 및 시간 매핑"""
    # 시간 매핑
    time_data = {}
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row[' Block number'])
            unix_time = int(row['Unix Epoch time'])
            time_data[block_num] = datetime.fromtimestamp(unix_time)

    # 모든 데이터 통합
    events_data = []

    # 스테이킹 데이터
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row['Block number'])
            if block_num in time_data:
                events_data.append({
                    'date': time_data[block_num],
                    'block': block_num,
                    'staked': float(row[' Staked (W)TON']),
                    'burned': 0,
                    'locked': 0,
                    'spent': 0,
                    'reduced_seig': 0
                })

    # 소각 데이터 추가
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        burned_dict = {}
        for row in reader:
            block_num = int(row['Block number'])
            burned_dict[block_num] = float(row[' Burned TON'])

    # DAO 락업 데이터 추가
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        locked_dict = {}
        for row in reader:
            block_num = int(row['Block number'])
            locked_dict[block_num] = {
                'locked': float(row[' Locked TON']),
                'spent': float(row[' Spent TON'])
            }

    # Reduced Seignorage 데이터 추가
    with open('data/reducedSeigTON_column_H.csv', 'r') as f:
        reader = csv.DictReader(f)
        reduced_dict = {}
        for row in reader:
            block_num = int(row['Block number'])
            reduced_dict[block_num] = float(row[' Reduced seignorage'])

    # 데이터 병합
    for event in events_data:
        block = event['block']
        if block in burned_dict:
            event['burned'] = burned_dict[block]
        if block in locked_dict:
            event['locked'] = locked_dict[block]['locked']
            event['spent'] = locked_dict[block]['spent']
        if block in reduced_dict:
            event['reduced_seig'] = reduced_dict[block]

    return sorted(events_data, key=lambda x: x['date'])

def identify_major_events(data):
    """주요 이벤트 식별"""
    events = []

    # 1. 대규모 소각 이벤트 (10만 TON 이상)
    for d in data:
        if d['burned'] > 100_000:
            events.append({
                'date': d['date'],
                'type': 'Major Burn',
                'description': f"{d['burned']:,.0f} TON burned",
                'amount': d['burned']
            })

    # 2. 대규모 DAO 락업 이벤트 (100만 TON 이상)
    for d in data:
        if d['locked'] > 1_000_000:
            events.append({
                'date': d['date'],
                'type': 'DAO Lock',
                'description': f"{d['locked']:,.0f} TON locked",
                'amount': d['locked']
            })

    # 3. Reduced Seignorage 기간
    reduced_periods = [d for d in data if d['reduced_seig'] > 0]
    if reduced_periods:
        start_date = min(d['date'] for d in reduced_periods)
        end_date = max(d['date'] for d in reduced_periods)
        total_reduced = sum(d['reduced_seig'] for d in reduced_periods)
        events.append({
            'date': start_date,
            'type': 'Policy Change',
            'description': f"PowerTON rate reduction period ({start_date.strftime('%Y-%m')} to {end_date.strftime('%Y-%m')})",
            'amount': total_reduced,
            'end_date': end_date
        })

    # 4. 스테이킹 급증 기간 (월간 100만 TON 이상 증가)
    prev_staked = 0
    for i, d in enumerate(data):
        if i > 0:
            staking_increase = d['staked'] - prev_staked
            if staking_increase > 1_000_000:
                events.append({
                    'date': d['date'],
                    'type': 'Staking Surge',
                    'description': f"Staking increased by {staking_increase:,.0f} TON",
                    'amount': staking_increase
                })
        prev_staked = d['staked']

    return sorted(events, key=lambda x: x['date'])

def create_event_analysis():
    """이벤트 분석 차트 생성"""
    data = load_all_data()
    events = identify_major_events(data)

    dates = [d['date'] for d in data]
    staked = [d['staked'] / 1_000_000 for d in data]
    burned_cumulative = []
    locked_cumulative = []
    reduced_cumulative = []

    # 누적 계산
    cum_burned = 0
    cum_locked = 0
    cum_reduced = 0

    for d in data:
        cum_burned += d['burned']
        cum_locked += (d['locked'] - d['spent'])
        cum_reduced += d['reduced_seig']

        burned_cumulative.append(cum_burned / 1_000_000)
        locked_cumulative.append(cum_locked / 1_000_000)
        reduced_cumulative.append(cum_reduced / 1_000)

    # 3개 서브플롯 생성
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(16, 14))
    fig.suptitle('TON Major Events Timeline Analysis', fontsize=18, fontweight='bold')

    # 상단: 전체 타임라인과 주요 이벤트
    ax1.plot(dates, staked, linewidth=2, color='orange', label='Staked TON', alpha=0.8)
    ax1_twin = ax1.twinx()
    ax1_twin.plot(dates, burned_cumulative, linewidth=2, color='red', label='Cumulative Burned', linestyle='--')
    ax1_twin.plot(dates, locked_cumulative, linewidth=2, color='purple', label='Cumulative DAO Locked', linestyle=':')

    # 주요 이벤트 마커
    for event in events:
        if event['type'] == 'Major Burn':
            ax1.axvline(x=event['date'], color='red', alpha=0.7, linestyle='--')
            ax1.text(event['date'], max(staked) * 0.9, f"🔥 {event['amount']/1_000_000:.1f}M",
                    rotation=90, ha='right', va='top', fontsize=8, color='red')
        elif event['type'] == 'DAO Lock':
            ax1.axvline(x=event['date'], color='purple', alpha=0.7, linestyle=':')
            ax1.text(event['date'], max(staked) * 0.8, f"🏛️ {event['amount']/1_000_000:.1f}M",
                    rotation=90, ha='right', va='top', fontsize=8, color='purple')
        elif event['type'] == 'Policy Change':
            ax1.axvspan(event['date'], event['end_date'], alpha=0.2, color='yellow')
            ax1.text(event['date'], max(staked) * 0.7, "📉 Policy Change",
                    rotation=90, ha='right', va='top', fontsize=8, color='orange')

    ax1.set_title('Timeline of Major Events', fontsize=14, fontweight='bold')
    ax1.set_ylabel('Staked TON (Millions)', fontsize=12, color='orange')
    ax1_twin.set_ylabel('Cumulative Burned/Locked (Millions)', fontsize=12)
    ax1.legend(loc='upper left')
    ax1_twin.legend(loc='upper right')
    ax1.grid(True, alpha=0.3)

    # 중간: 2021년 대규모 소각 이벤트 확대
    burn_event_date = None
    for event in events:
        if event['type'] == 'Major Burn':
            burn_event_date = event['date']
            break

    if burn_event_date:
        # 이벤트 전후 30일
        start_zoom = burn_event_date - timedelta(days=30)
        end_zoom = burn_event_date + timedelta(days=30)

        zoom_data = [d for d in data if start_zoom <= d['date'] <= end_zoom]
        zoom_dates = [d['date'] for d in zoom_data]
        zoom_staked = [d['staked'] / 1_000_000 for d in zoom_data]
        zoom_burned = [d['burned'] / 1_000_000 for d in zoom_data]

        ax2.plot(zoom_dates, zoom_staked, linewidth=3, color='orange', label='Staked TON', marker='o', markersize=4)
        ax2_twin = ax2.twinx()

        # 소각 이벤트만 바 차트로
        burn_dates = [d['date'] for d in zoom_data if d['burned'] > 0]
        burn_amounts = [d['burned'] / 1_000_000 for d in zoom_data if d['burned'] > 0]

        if burn_dates:
            ax2_twin.bar(burn_dates, burn_amounts, width=1, color='red', alpha=0.7, label='Burned TON')

        ax2.axvline(x=burn_event_date, color='red', linewidth=3, alpha=0.8)
        ax2.set_title(f'Major Burn Event Zoom: {burn_event_date.strftime("%Y-%m-%d")}', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Staked TON (Millions)', fontsize=12, color='orange')
        ax2_twin.set_ylabel('Burned TON (Millions)', fontsize=12, color='red')
        ax2.legend(loc='upper left')
        ax2_twin.legend(loc='upper right')
        ax2.grid(True, alpha=0.3)

    # 하단: PowerTON 정책 변경 기간 확대
    policy_events = [e for e in events if e['type'] == 'Policy Change']
    if policy_events:
        policy_event = policy_events[0]
        policy_start = policy_event['date']
        policy_end = policy_event['end_date']

        # 정책 변경 전후 60일
        zoom_start = policy_start - timedelta(days=60)
        zoom_end = policy_end + timedelta(days=60)

        policy_data = [d for d in data if zoom_start <= d['date'] <= zoom_end]
        policy_dates = [d['date'] for d in policy_data]
        policy_staked = [d['staked'] / 1_000_000 for d in policy_data]
        policy_reduced = [d['reduced_seig'] / 1_000 for d in policy_data]

        ax3.plot(policy_dates, policy_staked, linewidth=3, color='orange', label='Staked TON')
        ax3_twin = ax3.twinx()

        # Reduced seignorage 영역 표시
        reduced_dates = [d['date'] for d in policy_data if d['reduced_seig'] > 0]
        reduced_amounts = [d['reduced_seig'] / 1_000 for d in policy_data if d['reduced_seig'] > 0]

        if reduced_dates:
            ax3_twin.bar(reduced_dates, reduced_amounts, width=10, color='yellow', alpha=0.7, label='Reduced Seignorage (K TON)')

        ax3.axvspan(policy_start, policy_end, alpha=0.3, color='yellow')
        ax3.set_title(f'PowerTON Policy Change Period: {policy_start.strftime("%Y-%m")} to {policy_end.strftime("%Y-%m")}',
                     fontsize=14, fontweight='bold')
        ax3.set_ylabel('Staked TON (Millions)', fontsize=12, color='orange')
        ax3_twin.set_ylabel('Reduced Seignorage (K TON)', fontsize=12, color='orange')
        ax3.set_xlabel('Time', fontsize=12)
        ax3.legend(loc='upper left')
        ax3_twin.legend(loc='upper right')
        ax3.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('ton_event_analysis.png', dpi=300, bbox_inches='tight')
    print("📊 이벤트 분석 차트 저장: 'ton_event_analysis.png'")

    # 이벤트 요약 출력
    print(f"\n🎯 Major Events Summary:")
    print("="*50)
    for event in events:
        if 'end_date' in event:
            print(f"📅 {event['date'].strftime('%Y-%m-%d')} to {event['end_date'].strftime('%Y-%m-%d')}: {event['type']}")
        else:
            print(f"📅 {event['date'].strftime('%Y-%m-%d')}: {event['type']}")
        print(f"   {event['description']}")
        print()

    plt.show()

if __name__ == "__main__":
    print("🚀 TON 이벤트 분석 시작...")
    create_event_analysis()
    print("✅ 완료!")