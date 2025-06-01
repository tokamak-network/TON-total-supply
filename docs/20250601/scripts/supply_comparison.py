#!/usr/bin/env python3
"""
TON 순환공급량 vs 총공급량 비교
"""

import csv
import matplotlib.pyplot as plt
from datetime import datetime
import matplotlib.font_manager as fm

# 한글 폰트 설정
def setup_korean_font():
    """한글 폰트 설정"""
    # Mac에서 사용 가능한 한글 폰트들 시도
    korean_fonts = ['AppleGothic', 'Arial Unicode MS', 'Malgun Gothic', 'Noto Sans CJK KR']

    for font_name in korean_fonts:
        try:
            font = fm.FontProperties(fname=font_name)
            plt.rcParams['font.family'] = font_name
            print(f"✅ 한글 폰트 설정: {font_name}")
            break
        except:
            continue
    else:
        # 폰트를 못 찾으면 영어로 표시
        print("⚠️ 한글 폰트를 찾을 수 없어 영어로 표시합니다.")
        plt.rcParams['font.family'] = 'DejaVu Sans'

setup_korean_font()
plt.rcParams['axes.unicode_minus'] = False

def load_data():
    """데이터 로드"""
    # 시간 데이터
    time_data = []
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            time_data.append({
                'unix_time': int(row['Unix Epoch time']),
                'block_number': int(row[' Block number']),
                'date': datetime.fromtimestamp(int(row['Unix Epoch time']))
            })

    # 각 감소 요인들 로드
    staked_data = []
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            staked_data.append({
                'block_number': int(row['Block number']),
                'staked': float(row[' Staked (W)TON'])
            })

    burned_data = []
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            burned_data.append({
                'block_number': int(row['Block number']),
                'burned': float(row[' Burned TON'])
            })

    locked_data = []
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            locked_data.append({
                'block_number': int(row['Block number']),
                'locked': float(row[' Locked TON']),
                'spent': float(row[' Spent TON'])
            })

    return time_data, staked_data, burned_data, locked_data

def calculate_supply():
    """순환공급량과 총공급량 계산"""
    time_data, staked_data, burned_data, locked_data = load_data()

    # 블록 번호를 키로 하는 딕셔너리 생성
    block_to_date = {t['block_number']: t['date'] for t in time_data}

    results = []
    total_supply_initial = 50_000_000  # 5천만 TON 초기 발행량

    # 각 시점별 계산
    cumulative_burned = 0
    cumulative_locked = 0

    for i in range(len(staked_data)):
        block_num = staked_data[i]['block_number']
        if block_num not in block_to_date:
            continue

        # 누적 소각량
        cumulative_burned += burned_data[i]['burned']

        # 누적 순 락업량 (락업 - 지출)
        net_locked_this_period = locked_data[i]['locked'] - locked_data[i]['spent']
        cumulative_locked += net_locked_this_period

        # 스테이킹량
        staked_amount = staked_data[i]['staked']

        # 총공급량 (초기 - 소각량)
        total_supply = total_supply_initial - cumulative_burned

        # 순환공급량 (총공급량 - 스테이킹 - DAO락업)
        circulating_supply = total_supply - staked_amount - cumulative_locked

        results.append({
            'date': block_to_date[block_num],
            'total_supply': total_supply / 1_000_000,  # 백만 단위
            'circulating_supply': circulating_supply / 1_000_000,
            'staked': staked_amount / 1_000_000,
            'locked': cumulative_locked / 1_000_000,
            'burned': cumulative_burned / 1_000_000
        })

    return results

def create_supply_chart():
    """공급량 비교 차트 생성"""
    data = calculate_supply()

    dates = [d['date'] for d in data]
    total_supply = [d['total_supply'] for d in data]
    circulating_supply = [d['circulating_supply'] for d in data]
    staked = [d['staked'] for d in data]
    locked = [d['locked'] for d in data]

    # 차트 생성
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))

    # 상단: 공급량 비교
    ax1.plot(dates, total_supply, linewidth=3, color='navy', label='Total Supply', marker='o', markersize=3)
    ax1.plot(dates, circulating_supply, linewidth=3, color='green', label='Circulating Supply', marker='s', markersize=3)

    ax1.fill_between(dates, circulating_supply, alpha=0.3, color='lightgreen', label='Circulating Area')
    ax1.fill_between(dates, total_supply, circulating_supply, alpha=0.3, color='lightblue', label='Non-Circulating (Staked+Locked)')

    ax1.set_title('TON Total Supply vs Circulating Supply', fontsize=16, fontweight='bold', pad=20)
    ax1.set_ylabel('Supply (Million TON)', fontsize=12)
    ax1.legend(loc='upper left')
    ax1.grid(True, alpha=0.3)

    # 현재 값 표시
    current_total = total_supply[-1]
    current_circulating = circulating_supply[-1]
    reduction_rate = ((current_total - current_circulating) / current_total) * 100

    ax1.text(0.02, 0.95, f'Current Total: {current_total:.1f}M TON\nCurrent Circulating: {current_circulating:.1f}M TON\nCirculation Rate: {100-reduction_rate:.1f}%',
             transform=ax1.transAxes, va='top',
             bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.8), fontsize=10)

    # 하단: 비순환 요소들의 분해
    ax2.fill_between(dates, staked, alpha=0.7, color='orange', label='Staked TON')
    ax2.fill_between(dates, [s + l for s, l in zip(staked, locked)], staked, alpha=0.7, color='purple', label='DAO Locked TON')

    ax2.set_title('Non-Circulating Supply Components', fontsize=14, fontweight='bold')
    ax2.set_ylabel('Non-Circulating (Million TON)', fontsize=12)
    ax2.set_xlabel('Time', fontsize=12)
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    # 최신 비율 표시
    current_staked = staked[-1]
    current_locked = locked[-1]
    staked_ratio = (current_staked / current_total) * 100
    locked_ratio = (current_locked / current_total) * 100

    ax2.text(0.02, 0.95, f'Staked: {current_staked:.1f}M TON ({staked_ratio:.1f}%)\nDAO Locked: {current_locked:.1f}M TON ({locked_ratio:.1f}%)',
             transform=ax2.transAxes, va='top',
             bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8), fontsize=10)

    plt.tight_layout()
    plt.savefig('ton_supply_comparison.png', dpi=300, bbox_inches='tight')
    print("📊 공급량 비교 차트 저장: 'ton_supply_comparison.png'")

    # 요약 통계 출력
    print(f"\n📈 TON Supply Analysis Summary:")
    print(f"   Total Supply: {current_total:.1f}M TON")
    print(f"   Circulating Supply: {current_circulating:.1f}M TON")
    print(f"   Circulation Rate: {100-reduction_rate:.1f}%")
    print(f"   Staking Ratio: {staked_ratio:.1f}%")
    print(f"   DAO Lock Ratio: {locked_ratio:.1f}%")

    plt.show()

if __name__ == "__main__":
    print("🚀 TON 공급량 비교 분석 시작...")
    create_supply_chart()
    print("✅ 완료!")