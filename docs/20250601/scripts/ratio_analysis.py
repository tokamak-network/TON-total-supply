#!/usr/bin/env python3
"""
TON 비율 기준 분석 - 전체 공급량 대비 각 요인의 % 변화 추이
"""

import csv
import matplotlib.pyplot as plt
from datetime import datetime
import numpy as np

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

def load_and_calculate_ratios():
    """데이터 로드 및 비율 계산"""
    # 시간 매핑
    time_data = {}
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row[' Block number'])
            unix_time = int(row['Unix Epoch time'])
            time_data[block_num] = datetime.fromtimestamp(unix_time)

    # 모든 데이터 로드
    staked_data = {}
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row['Block number'])
            staked_data[block_num] = float(row[' Staked (W)TON'])

    burned_data = {}
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row['Block number'])
            burned_data[block_num] = float(row[' Burned TON'])

    locked_data = {}
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            block_num = int(row['Block number'])
            locked_data[block_num] = {
                'locked': float(row[' Locked TON']),
                'spent': float(row[' Spent TON'])
            }

    # 시계열 데이터 구성
    results = []
    initial_supply = 50_000_000
    cumulative_burned = 0
    cumulative_locked = 0

    for block_num in sorted(time_data.keys()):
        if block_num in staked_data:
            # 누적 계산
            if block_num in burned_data:
                cumulative_burned += burned_data[block_num]

            if block_num in locked_data:
                net_locked = locked_data[block_num]['locked'] - locked_data[block_num]['spent']
                cumulative_locked += net_locked

            # 현재 상태 계산
            current_staked = staked_data[block_num]
            current_total_supply = initial_supply - cumulative_burned
            current_circulating = current_total_supply - current_staked - cumulative_locked

            # 비율 계산 (초기 공급량 대비)
            staked_ratio = (current_staked / initial_supply) * 100
            burned_ratio = (cumulative_burned / initial_supply) * 100
            locked_ratio = (cumulative_locked / initial_supply) * 100
            circulating_ratio = (current_circulating / initial_supply) * 100

            # 현재 총공급량 대비 비율
            staked_ratio_current = (current_staked / current_total_supply) * 100
            locked_ratio_current = (cumulative_locked / current_total_supply) * 100
            circulating_ratio_current = (current_circulating / current_total_supply) * 100

            results.append({
                'date': time_data[block_num],
                'staked_ratio_initial': staked_ratio,
                'burned_ratio_initial': burned_ratio,
                'locked_ratio_initial': locked_ratio,
                'circulating_ratio_initial': circulating_ratio,
                'staked_ratio_current': staked_ratio_current,
                'locked_ratio_current': locked_ratio_current,
                'circulating_ratio_current': circulating_ratio_current,
                'network_maturity': staked_ratio + locked_ratio,  # 네트워크 성숙도 지표
                'supply_efficiency': circulating_ratio,  # 공급 효율성
                'total_reduction': burned_ratio + (100 - circulating_ratio - burned_ratio)  # 총 공급량 감소
            })

    return results

def create_ratio_analysis():
    """비율 분석 차트 생성"""
    data = load_and_calculate_ratios()

    dates = [d['date'] for d in data]

    # 2x2 서브플롯 생성
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('TON Supply Ratio Analysis - Network Evolution Metrics', fontsize=18, fontweight='bold')

    # 1. 초기 공급량 대비 각 요인의 비율 변화
    ax1.fill_between(dates, [d['circulating_ratio_initial'] for d in data],
                     alpha=0.7, color='lightgreen', label='Circulating %')
    ax1.fill_between(dates,
                     [d['circulating_ratio_initial'] + d['staked_ratio_initial'] for d in data],
                     [d['circulating_ratio_initial'] for d in data],
                     alpha=0.7, color='orange', label='Staked %')
    ax1.fill_between(dates,
                     [d['circulating_ratio_initial'] + d['staked_ratio_initial'] + d['locked_ratio_initial'] for d in data],
                     [d['circulating_ratio_initial'] + d['staked_ratio_initial'] for d in data],
                     alpha=0.7, color='purple', label='DAO Locked %')
    ax1.fill_between(dates, [100 for _ in data],
                     [d['circulating_ratio_initial'] + d['staked_ratio_initial'] + d['locked_ratio_initial'] for d in data],
                     alpha=0.7, color='lightcoral', label='Burned %')

    ax1.set_title('Supply Distribution vs Initial 50M TON', fontsize=14, fontweight='bold')
    ax1.set_ylabel('Percentage of Initial Supply (%)', fontsize=12)
    ax1.legend(loc='right')
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim(0, 100)

    # 2. 현재 총공급량 대비 비율 (순환 vs 비순환)
    circulating_current = [d['circulating_ratio_current'] for d in data]
    non_circulating_current = [100 - d['circulating_ratio_current'] for d in data]

    ax2.fill_between(dates, circulating_current, alpha=0.7, color='green', label='Circulating %')
    ax2.fill_between(dates, [100 for _ in data], circulating_current, alpha=0.7, color='gray', label='Non-Circulating %')

    # 순환률 트렌드 라인
    ax2.plot(dates, circulating_current, linewidth=3, color='darkgreen', label='Circulation Rate Trend')

    ax2.set_title('Circulating vs Non-Circulating (Current Supply)', fontsize=14, fontweight='bold')
    ax2.set_ylabel('Percentage of Current Supply (%)', fontsize=12)
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.set_ylim(0, 100)

    # 3. 네트워크 성숙도 지표
    network_maturity = [d['network_maturity'] for d in data]

    ax3.plot(dates, network_maturity, linewidth=3, color='navy', marker='o', markersize=3)
    ax3.fill_between(dates, network_maturity, alpha=0.3, color='lightblue')

    # 성숙도 단계 표시
    ax3.axhline(y=20, color='red', linestyle='--', alpha=0.7, label='Early Stage (< 20%)')
    ax3.axhline(y=50, color='orange', linestyle='--', alpha=0.7, label='Growth Stage (< 50%)')
    ax3.axhline(y=80, color='green', linestyle='--', alpha=0.7, label='Mature Stage (< 80%)')

    ax3.set_title('Network Maturity Index (Staked + DAO Locked %)', fontsize=14, fontweight='bold')
    ax3.set_ylabel('Maturity Index (%)', fontsize=12)
    ax3.legend()
    ax3.grid(True, alpha=0.3)

    # 현재 성숙도 표시
    current_maturity = network_maturity[-1]
    ax3.text(0.02, 0.95, f'Current Maturity: {current_maturity:.1f}%',
             transform=ax3.transAxes, va='top',
             bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.8), fontsize=11)

    # 4. 시간별 변화율 분석 (월간 변화)
    monthly_changes = []
    dates_monthly = []

    for i in range(12, len(data), 4):  # 대략 3개월 간격
        if i < len(data):
            prev_idx = max(0, i-4)

            staking_change = data[i]['staked_ratio_initial'] - data[prev_idx]['staked_ratio_initial']
            circulating_change = data[i]['circulating_ratio_initial'] - data[prev_idx]['circulating_ratio_initial']

            monthly_changes.append({
                'date': data[i]['date'],
                'staking_change': staking_change,
                'circulating_change': circulating_change
            })
            dates_monthly.append(data[i]['date'])

    if monthly_changes:
        staking_changes = [c['staking_change'] for c in monthly_changes]
        circulating_changes = [c['circulating_change'] for c in monthly_changes]

        ax4.bar(dates_monthly, staking_changes, width=30, alpha=0.7, color='orange', label='Staking Rate Change')
        ax4.bar(dates_monthly, circulating_changes, width=30, alpha=0.7, color='green',
                bottom=staking_changes, label='Circulation Rate Change')

        ax4.axhline(y=0, color='black', linewidth=1)
        ax4.set_title('Periodic Rate Changes (% points)', fontsize=14, fontweight='bold')
        ax4.set_ylabel('Change in Percentage Points', fontsize=12)
        ax4.set_xlabel('Time', fontsize=12)
        ax4.legend()
        ax4.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('ton_ratio_analysis.png', dpi=300, bbox_inches='tight')
    print("📊 비율 분석 차트 저장: 'ton_ratio_analysis.png'")

    # 분석 요약 출력
    print(f"\n📈 TON Ratio Analysis Summary:")
    print("="*60)

    latest = data[-1]
    print(f"Network Maturity Metrics (as of {latest['date'].strftime('%Y-%m-%d')}):")
    print(f"  • Network Maturity Index: {latest['network_maturity']:.1f}%")
    print(f"  • Circulation Efficiency: {latest['circulating_ratio_current']:.1f}%")
    print(f"  • Staking Participation: {latest['staked_ratio_initial']:.1f}% of initial supply")
    print(f"  • DAO Lock Ratio: {latest['locked_ratio_initial']:.1f}% of initial supply")
    print(f"  • Supply Reduction: {latest['burned_ratio_initial']:.1f}% burned permanently")

    # 시기별 분석
    early_data = data[10]  # 초기
    growth_data = data[len(data)//2]  # 중간
    mature_data = data[-1]  # 현재

    print(f"\nEvolution Phases:")
    print(f"Early ({early_data['date'].strftime('%Y-%m')}):")
    print(f"  - Maturity: {early_data['network_maturity']:.1f}%, Circulation: {early_data['circulating_ratio_current']:.1f}%")

    print(f"Growth ({growth_data['date'].strftime('%Y-%m')}):")
    print(f"  - Maturity: {growth_data['network_maturity']:.1f}%, Circulation: {growth_data['circulating_ratio_current']:.1f}%")

    print(f"Mature ({mature_data['date'].strftime('%Y-%m')}):")
    print(f"  - Maturity: {mature_data['network_maturity']:.1f}%, Circulation: {mature_data['circulating_ratio_current']:.1f}%")

    # 성숙도 단계 판정
    if latest['network_maturity'] < 20:
        stage = "Early Stage 🌱"
    elif latest['network_maturity'] < 50:
        stage = "Growth Stage 🚀"
    elif latest['network_maturity'] < 80:
        stage = "Mature Stage 🌟"
    else:
        stage = "Fully Mature Stage 💎"

    print(f"\nCurrent Network Stage: {stage}")
    print(f"Key Insight: {latest['circulating_ratio_current']:.1f}% circulation rate indicates strong network participation")

    plt.show()

if __name__ == "__main__":
    print("🚀 TON 비율 분석 시작...")
    create_ratio_analysis()
    print("✅ 완료!")