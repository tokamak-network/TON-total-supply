#!/usr/bin/env python3
"""
DAO 지출 및 효과성 분석 스크립트
"""

import csv
from datetime import datetime

def analyze_dao_spending():
    print('📊 DAO 지출 및 효과성 분석')
    print('='*50)

    # DAO 데이터 로드
    dao_data = []
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dao_data.append({
                'block': int(row['Block number']),
                'locked': float(row[' Locked TON']),
                'spent': float(row[' Spent TON'])
            })

    # 시간 데이터 로드
    time_data = {}
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            time_data[int(row[' Block number'])] = {
                'timestamp': int(row['Unix Epoch time']),
                'date': datetime.fromtimestamp(int(row['Unix Epoch time']))
            }

    # 기본 통계
    total_locked = sum(row['locked'] for row in dao_data)
    total_spent = sum(row['spent'] for row in dao_data)
    net_treasury = total_locked - total_spent

    print(f'총 락업량: {total_locked:,.0f} TON')
    print(f'총 지출량: {total_spent:,.0f} TON')
    print(f'현재 잔고: {net_treasury:,.0f} TON')
    print(f'지출 비율: {(total_spent/total_locked)*100:.2f}%')
    print()

    # 주요 지출 이벤트 분석
    spending_events = []
    for row in dao_data:
        if row['spent'] > 0:
            block = row['block']
            if block in time_data:
                spending_events.append({
                    'block': block,
                    'amount': row['spent'],
                    'date': time_data[block]['date']
                })

    print('🔍 주요 DAO 지출 이벤트:')
    for event in sorted(spending_events, key=lambda x: x['amount'], reverse=True):
        print(f'  {event["date"].strftime("%Y-%m-%d")}: {event["amount"]:,.1f} TON (블록 {event["block"]})')

    print()
    print('📈 연도별 지출 현황:')
    yearly_spending = {}
    for event in spending_events:
        year = event['date'].year
        if year not in yearly_spending:
            yearly_spending[year] = 0
        yearly_spending[year] += event['amount']

    for year in sorted(yearly_spending.keys()):
        print(f'  {year}년: {yearly_spending[year]:,.1f} TON')

    print()
    print('📋 DAO 효과성 지표:')
    print(f'  평균 지출주기: {len(dao_data) / len(spending_events):.1f} 블록당 1회')
    print(f'  자금 보존율: {(net_treasury/total_locked)*100:.1f}%')
    print(f'  연간 소비율: {(total_spent/total_locked/4.75)*100:.2f}% (4.75년 기준)')

if __name__ == "__main__":
    analyze_dao_spending()