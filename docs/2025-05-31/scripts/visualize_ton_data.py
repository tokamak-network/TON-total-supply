#!/usr/bin/env python3
"""
TON Supply Analysis Data Visualization
시계열 데이터를 시각화하여 TON 네트워크의 진화를 보여줍니다.
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import numpy as np
import os

# 한글 폰트 설정 (한글 제목을 위해)
plt.rcParams['font.family'] = ['Arial Unicode MS', 'Malgun Gothic', 'AppleGothic', 'sans-serif']
plt.rcParams['axes.unicode_minus'] = False

def load_data():
    """CSV 파일들을 로드하고 전처리합니다."""

    # 블록 번호와 시간 매핑 로드
    block_time_df = pd.read_csv('data/blockNumber_column_F.csv')
    block_time_df.columns = ['unix_time', 'block_number']
    block_time_df['date'] = pd.to_datetime(block_time_df['unix_time'], unit='s')

    # 각 데이터 파일 로드
    staked_df = pd.read_csv('data/stakedTON_column_Y.csv')
    burned_df = pd.read_csv('data/burnedTON_column_J.csv')
    locked_df = pd.read_csv('data/lockedTON+spentTON_column_V+W.csv')
    reduced_seig_df = pd.read_csv('data/reducedSeigTON_column_H.csv')
    burned_seig_df = pd.read_csv('data/burnedSeigSWTON.csv')

    # 블록 번호를 기준으로 날짜 정보 추가
    def add_dates(df, block_col_name):
        df_merged = df.merge(
            block_time_df[['block_number', 'date']],
            left_on=block_col_name,
            right_on='block_number',
            how='left'
        )
        return df_merged.sort_values('date')

    staked_df = add_dates(staked_df, 'Block number')
    burned_df = add_dates(burned_df, 'Block number')
    locked_df = add_dates(locked_df, 'Block number')
    reduced_seig_df = add_dates(reduced_seig_df, 'Block number')
    burned_seig_df = add_dates(burned_seig_df, 'Block number')

    return staked_df, burned_df, locked_df, reduced_seig_df, burned_seig_df

def create_comprehensive_chart():
    """종합적인 TON 데이터 시각화 차트를 생성합니다."""

    # 데이터 로드
    staked_df, burned_df, locked_df, reduced_seig_df, burned_seig_df = load_data()

    # 4개 서브플롯 생성
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('TON (Tokamak Network) Supply Analysis - Time Series Data', fontsize=16, fontweight='bold')

    # 1. 스테이킹된 TON
    ax1.plot(staked_df['date'], staked_df['Staked (W)TON'] / 1_000_000,
             linewidth=2, color='#2E8B57', marker='o', markersize=3)
    ax1.set_title('📈 Staked TON Over Time', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Staked TON (Millions)', fontsize=10)
    ax1.grid(True, alpha=0.3)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)

    # 주요 포인트 표시
    max_idx = staked_df['Staked (W)TON'].idxmax()
    ax1.annotate(f'Latest: {staked_df.iloc[-1]["Staked (W)TON"]/1_000_000:.1f}M TON',
                xy=(staked_df.iloc[-1]['date'], staked_df.iloc[-1]['Staked (W)TON']/1_000_000),
                xytext=(10, 10), textcoords='offset points',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7),
                fontsize=8)

    # 2. 소각된 TON (로그 스케일로 보기)
    burned_nonzero = burned_df[burned_df['Burned TON'] > 0]
    ax2.semilogy(burned_nonzero['date'], burned_nonzero['Burned TON'],
                 linewidth=2, color='#DC143C', marker='s', markersize=4)
    ax2.set_title('🔥 Burned TON Events (Log Scale)', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Burned TON (Log Scale)', fontsize=10)
    ax2.grid(True, alpha=0.3)
    ax2.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax2.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)

    # 대규모 소각 이벤트 표시
    large_burn = burned_nonzero[burned_nonzero['Burned TON'] > 100000]
    if not large_burn.empty:
        for _, row in large_burn.iterrows():
            ax2.annotate(f'{row["Burned TON"]/1_000_000:.2f}M TON',
                        xy=(row['date'], row['Burned TON']),
                        xytext=(10, 20), textcoords='offset points',
                        bbox=dict(boxstyle='round,pad=0.3', facecolor='red', alpha=0.7),
                        fontsize=8, color='white')

    # 3. DAO 락/지출 TON
    # 순 락된 양 계산 (누적)
    locked_df['Net_Locked'] = (locked_df['Locked TON'] - locked_df['Spent TON']).cumsum()

    ax3.fill_between(locked_df['date'], locked_df['Net_Locked'] / 1_000_000,
                     alpha=0.6, color='#4169E1', label='Net Locked TON')
    ax3.plot(locked_df['date'], locked_df['Net_Locked'] / 1_000_000,
             linewidth=2, color='#000080')
    ax3.set_title('🏛️ DAO Vault - Net Locked TON', fontsize=12, fontweight='bold')
    ax3.set_ylabel('Net Locked TON (Millions)', fontsize=10)
    ax3.grid(True, alpha=0.3)
    ax3.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax3.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45)

    # 4. 감소된 Seignorage
    reduced_nonzero = reduced_seig_df[reduced_seig_df['Reduced seignorage'] > 0]
    if not reduced_nonzero.empty:
        ax4.bar(reduced_nonzero['date'], reduced_nonzero['Reduced seignorage'] / 1000,
                width=20, color='#FF8C00', alpha=0.7, edgecolor='#FF4500')
        ax4.set_title('📉 Reduced Seignorage Events', fontsize=12, fontweight='bold')
        ax4.set_ylabel('Reduced Seignorage (K TON)', fontsize=10)
        ax4.grid(True, alpha=0.3)

        # 기간 표시
        start_date = reduced_nonzero['date'].min()
        end_date = reduced_nonzero['date'].max()
        ax4.annotate(f'Policy Period\n{start_date.strftime("%Y-%m")} to {end_date.strftime("%Y-%m")}',
                    xy=(0.5, 0.8), xycoords='axes fraction',
                    bbox=dict(boxstyle='round,pad=0.5', facecolor='orange', alpha=0.7),
                    fontsize=9, ha='center')
    else:
        ax4.text(0.5, 0.5, 'No Reduced Seignorage Data',
                transform=ax4.transAxes, ha='center', va='center', fontsize=12)

    ax4.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax4.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45)

    # 레이아웃 조정
    plt.tight_layout()

    # 이미지 저장
    plt.savefig('ton_supply_analysis.png', dpi=300, bbox_inches='tight')
    print("📊 Chart saved as 'ton_supply_analysis.png'")

    plt.show()

def create_summary_stats():
    """주요 통계 요약을 생성합니다."""

    staked_df, burned_df, locked_df, reduced_seig_df, burned_seig_df = load_data()

    print("\n" + "="*60)
    print("🔍 TON SUPPLY ANALYSIS - KEY STATISTICS")
    print("="*60)

    # 스테이킹 통계
    current_staked = staked_df.iloc[-1]['Staked (W)TON']
    max_staked = staked_df['Staked (W)TON'].max()
    staking_growth = ((current_staked - staked_df.iloc[1]['Staked (W)TON']) / staked_df.iloc[1]['Staked (W)TON']) * 100

    print(f"📈 STAKING METRICS:")
    print(f"   Current Staked: {current_staked:,.0f} TON")
    print(f"   Max Staked (All-time): {max_staked:,.0f} TON")
    print(f"   Growth since start: {staking_growth:.1f}%")

    # 소각 통계
    total_burned = burned_df['Burned TON'].sum()
    largest_burn = burned_df['Burned TON'].max()
    burn_events = len(burned_df[burned_df['Burned TON'] > 0])

    print(f"\n🔥 BURNING METRICS:")
    print(f"   Total Burned: {total_burned:,.0f} TON")
    print(f"   Largest Single Burn: {largest_burn:,.0f} TON")
    print(f"   Number of Burn Events: {burn_events}")

    # DAO 통계
    total_locked = locked_df['Locked TON'].sum()
    total_spent = locked_df['Spent TON'].sum()
    net_locked = total_locked - total_spent

    print(f"\n🏛️ DAO VAULT METRICS:")
    print(f"   Total Locked: {total_locked:,.0f} TON")
    print(f"   Total Spent: {total_spent:,.0f} TON")
    print(f"   Net Locked: {net_locked:,.0f} TON")

    # 감소된 seignorage 통계
    total_reduced = reduced_seig_df['Reduced seignorage'].sum()
    reduced_events = len(reduced_seig_df[reduced_seig_df['Reduced seignorage'] > 0])

    print(f"\n📉 SEIGNORAGE REDUCTION:")
    print(f"   Total Reduced: {total_reduced:,.0f} TON")
    print(f"   Events Count: {reduced_events}")

    print("="*60)

if __name__ == "__main__":
    print("🚀 Starting TON Supply Analysis Visualization...")

    # 데이터 디렉토리 확인
    if not os.path.exists('data'):
        print("❌ 'data' directory not found. Please run updateAll.js first.")
        exit(1)

    # 통계 요약 출력
    create_summary_stats()

    # 차트 생성
    create_comprehensive_chart()

    print("✅ Visualization complete!")