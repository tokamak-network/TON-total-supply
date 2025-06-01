#!/usr/bin/env python3
"""
Simple TON Supply Analysis Visualization
"""

import csv
import matplotlib.pyplot as plt
from datetime import datetime
import os

def read_csv_data(filename):
    """CSV 파일을 읽어서 리스트로 반환"""
    data = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return []
    return data

def create_charts():
    """시각화 차트 생성"""

    # 데이터 파일들 읽기
    staked_data = read_csv_data('data/stakedTON_column_Y.csv')
    burned_data = read_csv_data('data/burnedTON_column_J.csv')
    locked_data = read_csv_data('data/lockedTON+spentTON_column_V+W.csv')
    reduced_data = read_csv_data('data/reducedSeigTON_column_H.csv')
    time_data = read_csv_data('data/blockNumber_column_F.csv')

    if not all([staked_data, time_data]):
        print("❌ Required data files not found")
        return

    # 블록 번호를 날짜로 변환하는 매핑 생성
    block_to_date = {}
    for row in time_data:
        unix_time = int(row['Unix Epoch time'])
        block_num = int(row[' Block number'])
        date = datetime.fromtimestamp(unix_time)
        block_to_date[block_num] = date

    # 4개 서브플롯 생성
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('TON (Tokamak Network) Supply Analysis', fontsize=16, fontweight='bold')

    # 1. 스테이킹된 TON
    dates = []
    staked_amounts = []
    for row in staked_data:
        block_num = int(row['Block number'])
        if block_num in block_to_date:
            dates.append(block_to_date[block_num])
            staked_amounts.append(float(row[' Staked (W)TON']) / 1_000_000)

    ax1.plot(dates, staked_amounts, linewidth=2, color='green', marker='o', markersize=2)
    ax1.set_title('📈 Staked TON Over Time (Millions)', fontweight='bold')
    ax1.set_ylabel('Staked TON (M)')
    ax1.grid(True, alpha=0.3)
    ax1.tick_params(axis='x', rotation=45)

    # 최신 값 표시
    if staked_amounts:
        latest_value = staked_amounts[-1]
        ax1.text(0.02, 0.98, f'Latest: {latest_value:.1f}M TON',
                transform=ax1.transAxes, va='top',
                bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

    # 2. 소각된 TON (0이 아닌 값만)
    burn_dates = []
    burn_amounts = []
    for row in burned_data:
        block_num = int(row['Block number'])
        burn_amount = float(row[' Burned TON'])
        if burn_amount > 0 and block_num in block_to_date:
            burn_dates.append(block_to_date[block_num])
            burn_amounts.append(burn_amount)

    if burn_dates:
        ax2.semilogy(burn_dates, burn_amounts, 'ro-', linewidth=2, markersize=4)
        ax2.set_title('🔥 Burned TON Events (Log Scale)', fontweight='bold')
        ax2.set_ylabel('Burned TON (Log)')
        ax2.grid(True, alpha=0.3)
        ax2.tick_params(axis='x', rotation=45)

        # 최대 소각 이벤트 표시
        max_burn = max(burn_amounts)
        ax2.text(0.02, 0.98, f'Max Burn: {max_burn:,.0f} TON',
                transform=ax2.transAxes, va='top',
                bbox=dict(boxstyle='round', facecolor='red', alpha=0.7, color='white'))
    else:
        ax2.text(0.5, 0.5, 'No Burn Events', ha='center', va='center', transform=ax2.transAxes)

    # 3. DAO 락/지출 (순 누적)
    lock_dates = []
    net_locked = 0
    net_locked_amounts = []

    for row in locked_data:
        block_num = int(row['Block number'])
        if block_num in block_to_date:
            locked = float(row[' Locked TON'])
            spent = float(row[' Spent TON'])
            net_locked += (locked - spent)
            lock_dates.append(block_to_date[block_num])
            net_locked_amounts.append(net_locked / 1_000_000)

    if lock_dates:
        ax3.fill_between(lock_dates, net_locked_amounts, alpha=0.6, color='blue')
        ax3.plot(lock_dates, net_locked_amounts, linewidth=2, color='darkblue')
        ax3.set_title('🏛️ DAO Net Locked TON (Millions)', fontweight='bold')
        ax3.set_ylabel('Net Locked (M)')
        ax3.grid(True, alpha=0.3)
        ax3.tick_params(axis='x', rotation=45)

        if net_locked_amounts:
            current_locked = net_locked_amounts[-1]
            ax3.text(0.02, 0.98, f'Current: {current_locked:.1f}M TON',
                    transform=ax3.transAxes, va='top',
                    bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))

    # 4. 감소된 Seignorage
    reduced_dates = []
    reduced_amounts = []
    for row in reduced_data:
        block_num = int(row['Block number'])
        reduced_amount = float(row[' Reduced seignorage'])
        if reduced_amount > 0 and block_num in block_to_date:
            reduced_dates.append(block_to_date[block_num])
            reduced_amounts.append(reduced_amount / 1000)  # K TON 단위

    if reduced_dates:
        ax4.bar(reduced_dates, reduced_amounts, width=20, alpha=0.7, color='orange')
        ax4.set_title('📉 Reduced Seignorage (K TON)', fontweight='bold')
        ax4.set_ylabel('Reduced (K TON)')
        ax4.grid(True, alpha=0.3)
        ax4.tick_params(axis='x', rotation=45)

        total_reduced = sum(reduced_amounts)
        ax4.text(0.02, 0.98, f'Total: {total_reduced:.0f}K TON',
                transform=ax4.transAxes, va='top',
                bbox=dict(boxstyle='round', facecolor='orange', alpha=0.7))
    else:
        ax4.text(0.5, 0.5, 'No Reduction Events', ha='center', va='center', transform=ax4.transAxes)

    plt.tight_layout()
    plt.savefig('ton_analysis_chart.png', dpi=300, bbox_inches='tight')
    print("📊 Chart saved as 'ton_analysis_chart.png'")
    plt.show()

def print_summary():
    """요약 통계 출력"""
    print("\n" + "="*50)
    print("🔍 TON SUPPLY ANALYSIS SUMMARY")
    print("="*50)

    # 스테이킹 데이터 요약
    staked_data = read_csv_data('data/stakedTON_column_Y.csv')
    if staked_data:
        current_staked = float(staked_data[-1][' Staked (W)TON'])
        max_staked = max(float(row[' Staked (W)TON']) for row in staked_data)
        print(f"📈 Current Staked: {current_staked:,.0f} TON")
        print(f"📈 Max Staked: {max_staked:,.0f} TON")

    # 소각 데이터 요약
    burned_data = read_csv_data('data/burnedTON_column_J.csv')
    if burned_data:
        total_burned = sum(float(row[' Burned TON']) for row in burned_data)
        burn_events = len([row for row in burned_data if float(row[' Burned TON']) > 0])
        print(f"🔥 Total Burned: {total_burned:,.0f} TON")
        print(f"🔥 Burn Events: {burn_events}")

    # 락 데이터 요약
    locked_data = read_csv_data('data/lockedTON+spentTON_column_V+W.csv')
    if locked_data:
        total_locked = sum(float(row[' Locked TON']) for row in locked_data)
        total_spent = sum(float(row[' Spent TON']) for row in locked_data)
        print(f"🏛️ Total Locked: {total_locked:,.0f} TON")
        print(f"🏛️ Total Spent: {total_spent:,.0f} TON")
        print(f"🏛️ Net Locked: {total_locked - total_spent:,.0f} TON")

    print("="*50)

if __name__ == "__main__":
    print("🚀 Starting Simple TON Visualization...")

    if not os.path.exists('data'):
        print("❌ Data directory not found!")
        exit(1)

    print_summary()
    create_charts()
    print("✅ Visualization complete!")