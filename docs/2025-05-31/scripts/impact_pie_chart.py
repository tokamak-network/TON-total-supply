#!/usr/bin/env python3
"""
TON 공급량 감소 요인들의 상대적 영향도 분석 (파이차트)
"""

import csv
import matplotlib.pyplot as plt
from datetime import datetime
import numpy as np

# 폰트 설정
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

def load_latest_data():
    """최신 데이터 로드"""
    # 스테이킹 데이터
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        staked_data = list(reader)
        latest_staked = float(staked_data[-1][' Staked (W)TON'])

    # 소각 데이터 (누적)
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        burned_data = list(reader)
        total_burned = sum(float(row[' Burned TON']) for row in burned_data)

    # DAO 락업 데이터 (누적 순 락업)
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        locked_data = list(reader)
        total_locked = sum(float(row[' Locked TON']) for row in locked_data)
        total_spent = sum(float(row[' Spent TON']) for row in locked_data)
        net_locked = total_locked - total_spent

    # Reduced Seignorage 데이터
    with open('data/reducedSeigTON_column_H.csv', 'r') as f:
        reader = csv.DictReader(f)
        reduced_data = list(reader)
        total_reduced = sum(float(row[' Reduced seignorage']) for row in reduced_data)

    # 시간 데이터 (최신)
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        time_data = list(reader)
        latest_date = datetime.fromtimestamp(int(time_data[-1]['Unix Epoch time']))

    return {
        'staked': latest_staked,
        'burned': total_burned,
        'dao_locked': net_locked,
        'reduced_seignorage': total_reduced,
        'date': latest_date
    }

def create_impact_pie_charts():
    """영향도 파이차트들 생성"""
    data = load_latest_data()

    # 초기 공급량
    initial_supply = 50_000_000

    # 현재 총공급량 계산
    current_total_supply = initial_supply - data['burned']

    # 순환 공급량 계산
    circulating_supply = current_total_supply - data['staked'] - data['dao_locked']

    # 2x2 서브플롯 생성
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('TON Supply Reduction Factors - Impact Analysis', fontsize=18, fontweight='bold')

    # 1. 총공급량에서 각 감소 요인의 비중
    reduction_factors = [
        data['staked'],
        data['dao_locked'],
        data['burned'],
        data['reduced_seignorage']
    ]

    reduction_labels = [
        f'Staked\n{data["staked"]/1_000_000:.1f}M TON',
        f'DAO Locked\n{data["dao_locked"]/1_000_000:.1f}M TON',
        f'Burned\n{data["burned"]/1_000_000:.1f}M TON',
        f'Reduced Seignorage\n{data["reduced_seignorage"]/1_000:.0f}K TON'
    ]

    colors1 = ['#FF9500', '#8E44AD', '#E74C3C', '#F39C12']

    ax1.pie(reduction_factors, labels=reduction_labels, colors=colors1, autopct='%1.1f%%', startangle=90)
    ax1.set_title('Supply Reduction Factors\n(Absolute Values)', fontsize=14, fontweight='bold')

    # 2. 순환 vs 비순환 공급량
    circ_data = [circulating_supply, current_total_supply - circulating_supply]
    circ_labels = [
        f'Circulating\n{circulating_supply/1_000_000:.1f}M TON',
        f'Non-Circulating\n{(current_total_supply - circulating_supply)/1_000_000:.1f}M TON'
    ]
    colors2 = ['#2ECC71', '#95A5A6']

    ax2.pie(circ_data, labels=circ_labels, colors=colors2, autopct='%1.1f%%', startangle=90)
    ax2.set_title('Circulating vs Non-Circulating\nSupply Distribution', fontsize=14, fontweight='bold')

    # 3. 비순환 공급량의 구성 (스테이킹 vs DAO 락업)
    non_circ_data = [data['staked'], data['dao_locked']]
    non_circ_labels = [
        f'Staked\n{data["staked"]/1_000_000:.1f}M TON',
        f'DAO Locked\n{data["dao_locked"]/1_000_000:.1f}M TON'
    ]
    colors3 = ['#FF9500', '#8E44AD']

    ax3.pie(non_circ_data, labels=non_circ_labels, colors=colors3, autopct='%1.1f%%', startangle=90)
    ax3.set_title('Non-Circulating Supply\nBreakdown', fontsize=14, fontweight='bold')

    # 4. 전체 초기 공급량 대비 현재 상태
    total_breakdown = [
        circulating_supply,
        data['staked'],
        data['dao_locked'],
        data['burned']
    ]

    total_labels = [
        f'Circulating\n{circulating_supply/1_000_000:.1f}M TON',
        f'Staked\n{data["staked"]/1_000_000:.1f}M TON',
        f'DAO Locked\n{data["dao_locked"]/1_000_000:.1f}M TON',
        f'Burned\n{data["burned"]/1_000_000:.1f}M TON'
    ]

    colors4 = ['#2ECC71', '#FF9500', '#8E44AD', '#E74C3C']

    ax4.pie(total_breakdown, labels=total_labels, colors=colors4, autopct='%1.1f%%', startangle=90)
    ax4.set_title('Current Supply State\n(vs Initial 50M TON)', fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig('ton_impact_pie_charts.png', dpi=300, bbox_inches='tight')
    print("📊 영향도 파이차트 저장: 'ton_impact_pie_charts.png'")

    # 상세 통계 출력
    print(f"\n📊 TON Supply Impact Analysis ({data['date'].strftime('%Y-%m-%d')})")
    print("="*60)
    print(f"Initial Supply:     {initial_supply:,} TON")
    print(f"Current Total:      {current_total_supply:,} TON")
    print(f"Circulating:        {circulating_supply:,} TON ({circulating_supply/current_total_supply*100:.1f}%)")
    print(f"Non-Circulating:    {current_total_supply-circulating_supply:,} TON ({(current_total_supply-circulating_supply)/current_total_supply*100:.1f}%)")
    print()
    print("Reduction Factors:")
    print(f"  • Staked:         {data['staked']:,} TON ({data['staked']/current_total_supply*100:.1f}%)")
    print(f"  • DAO Locked:     {data['dao_locked']:,} TON ({data['dao_locked']/current_total_supply*100:.1f}%)")
    print(f"  • Burned:         {data['burned']:,} TON ({data['burned']/initial_supply*100:.1f}% of initial)")
    print(f"  • Reduced Seig:   {data['reduced_seignorage']:,} TON")
    print()
    print(f"Total Supply Reduction: {initial_supply - current_total_supply:,} TON ({(initial_supply - current_total_supply)/initial_supply*100:.1f}%)")
    print(f"Effective Circulation Rate: {circulating_supply/initial_supply*100:.1f}% of original supply")

    plt.show()

if __name__ == "__main__":
    print("🚀 TON 영향도 분석 시작...")
    create_impact_pie_charts()
    print("✅ 완료!")