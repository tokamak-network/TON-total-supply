#!/usr/bin/env python3
"""
TON 공급량 정량적 예측 모델
"""

import csv
from datetime import datetime
import math

def predictive_analysis():
    print('📈 TON 정량적 예측 모델 분석')
    print('='*50)

    # 스테이킹 데이터 로드
    staking_data = []
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            staking_data.append({
                'block': int(row['Block number']),
                'staked': float(row[' Staked (W)TON'])
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

    # 스테이킹 트렌드 분석
    recent_data = staking_data[-10:]  # 최근 10개 데이터포인트
    early_data = staking_data[:10]    # 초기 10개 데이터포인트

    recent_avg = sum(d['staked'] for d in recent_data) / len(recent_data)
    early_avg = sum(d['staked'] for d in early_data) / len(early_data)

    # 성장률 계산
    total_growth = (recent_avg - early_avg) / early_avg * 100
    period_years = 4.75  # 2020.8 ~ 2025.4
    cagr = (pow(recent_avg / early_avg, 1/period_years) - 1) * 100

    print('📊 스테이킹 성장 분석:')
    print(f'  초기 평균 (2020): {early_avg:,.0f} TON')
    print(f'  최근 평균 (2025): {recent_avg:,.0f} TON')
    print(f'  총 성장률: {total_growth:,.1f}%')
    print(f'  연평균 성장률 (CAGR): {cagr:.1f}%')

    # 순환 공급량 트렌드
    initial_supply = 50_000_000
    current_total = 47_921_953
    current_circulating = 6_596_637
    current_staked = recent_avg
    current_dao_locked = 17_458_010

    circulation_rate_trend = []
    for i, stake_data in enumerate(staking_data[-20:]):  # 최근 20개 포인트
        if stake_data['block'] in time_data:
            temp_circ = current_total - stake_data['staked'] - current_dao_locked
            temp_rate = temp_circ / current_total * 100
            circulation_rate_trend.append(temp_rate)

    avg_circulation_rate = sum(circulation_rate_trend) / len(circulation_rate_trend)

    print(f'\n📈 순환공급량 트렌드:')
    print(f'  평균 순환률 (최근): {avg_circulation_rate:.1f}%')
    print(f'  현재 순환률: {(current_circulating/current_total)*100:.1f}%')

    # 예측 모델 (선형 + 로그 성장)
    print(f'\n🔮 2026-2030 예측 (개선된 현실적 시나리오):')

    # 🔄 개선된 보수적 가정: 성장률 점진적 감소 + 하한선 설정
    future_years = [2026, 2027, 2028, 2029, 2030]
    growth_rates = [8, 6, 4, 3, 2]  # 🔄 더 현실적인 성장률로 조정

    predicted_staking = current_staked
    for year, growth in zip(future_years, growth_rates):
        predicted_staking *= (1 + growth/100)

        # 🔄 스테이킹 상한선 설정 (총 공급량의 70% 이하)
        max_stakeable = current_total * 0.70
        if predicted_staking > max_stakeable:
            predicted_staking = max_stakeable

        predicted_circulating = current_total - predicted_staking - current_dao_locked

        # 🔄 순환공급량 하한선 설정 (총 공급량의 5% 이상)
        min_circulating = current_total * 0.05
        if predicted_circulating < min_circulating:
            predicted_circulating = min_circulating
            predicted_staking = current_total - predicted_circulating - current_dao_locked

        predicted_circ_rate = predicted_circulating / current_total * 100
        predicted_maturity = (predicted_staking + current_dao_locked) / initial_supply * 100

        print(f'  {year}년:')
        print(f'    예상 스테이킹: {predicted_staking:,.0f} TON')
        print(f'    예상 순환률: {predicted_circ_rate:.1f}%')
        print(f'    예상 성숙도: {predicted_maturity:.1f}%')

        # 🔄 성장률 제한 알림
        if predicted_staking >= max_stakeable:
            print(f'    ⚠️ 스테이킹 상한 도달 (총공급량의 70%)')
        if predicted_circulating <= min_circulating:
            print(f'    ⚠️ 순환공급량 하한 도달 (총공급량의 5%)')

    # 🔄 시나리오별 분석 추가
    print(f'\n📊 시나리오별 2030년 전망:')

    scenarios = {
        '보수적': {'growth': 0.02, 'color': '🟢'},
        '균형적': {'growth': 0.05, 'color': '🟡'},
        '적극적': {'growth': 0.08, 'color': '🔴'}
    }

    for scenario_name, params in scenarios.items():
        future_staking = current_staked * (1 + params['growth']) ** 5  # 5년 후
        future_staking = min(future_staking, current_total * 0.70)  # 상한선 적용
        future_circulating = current_total - future_staking - current_dao_locked
        future_circulating = max(future_circulating, current_total * 0.05)  # 하한선 적용
        future_circ_rate = future_circulating / current_total * 100

        print(f'  {params["color"]} {scenario_name} (연 {params["growth"]*100:.0f}% 성장):')
        print(f'    스테이킹: {future_staking:,.0f} TON')
        print(f'    순환률: {future_circ_rate:.1f}%')

    # 리스크 시나리오
    print(f'\n⚠️ 리스크 시나리오 분석:')

    # 대량 언스테이킹 시나리오 (20% 감소)
    stress_unstaking = current_staked * 0.8
    stress_circulating = current_total - stress_unstaking - current_dao_locked
    stress_circ_rate = stress_circulating / current_total * 100

    print(f'  대량 언스테이킹 (20% 감소):')
    print(f'    스테이킹: {stress_unstaking:,.0f} TON')
    print(f'    순환률: {stress_circ_rate:.1f}%')
    print(f'    유동성 증가: {stress_circ_rate - (current_circulating/current_total)*100:.1f}%p')

    # 🔄 개선된 베스트 케이스 (현실적 제약 적용)
    best_case_staking = min(current_staked * 1.4, current_total * 0.70)  # 🔄 40% 증가 또는 70% 상한
    best_case_circulating = current_total - best_case_staking - current_dao_locked
    best_case_circulating = max(best_case_circulating, current_total * 0.05)  # 🔄 하한선 적용
    best_case_circ_rate = best_case_circulating / current_total * 100

    print(f'\n📈 베스트 케이스 (현실적 고성장):')
    print(f'    스테이킹: {best_case_staking:,.0f} TON')
    print(f'    순환률: {best_case_circ_rate:.1f}%')
    print(f'    네트워크 성숙도: {(best_case_staking + current_dao_locked)/initial_supply*100:.1f}%')

    # 🔄 시장 안정성 지표 추가
    print(f'\n📊 시장 안정성 지표:')
    stability_ratio = (current_staked + current_dao_locked) / current_total * 100
    liquidity_ratio = (current_circulating / current_total) * 100

    print(f'  안정성 비율 (스테이킹+락업): {stability_ratio:.1f}%')
    print(f'  유동성 비율 (순환공급): {liquidity_ratio:.1f}%')
    print(f'  균형 점수: {"🟢 양호" if 10 <= liquidity_ratio <= 25 else "🟡 주의" if liquidity_ratio < 10 else "🔴 위험"}')

if __name__ == "__main__":
    predictive_analysis()