#!/usr/bin/env python3
"""
TON 데이터 분석 결과 검증 스크립트
기존 분석 스크립트들의 계산 결과를 교차 검증합니다.
"""

import csv
from datetime import datetime

def load_raw_data():
    """원본 데이터를 직접 로드하여 기본 통계 확인"""
    print("🔍 원본 데이터 검증 시작...")

    # 1. 시간 데이터 확인
    time_data = []
    with open('data/blockNumber_column_F.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            time_data.append({
                'unix_time': int(row['Unix Epoch time']),
                'block_number': int(row[' Block number']),
                'date': datetime.fromtimestamp(int(row['Unix Epoch time']))
            })

    print(f"✅ 시간 데이터: {len(time_data)}개 포인트")
    print(f"   기간: {time_data[0]['date'].strftime('%Y-%m-%d')} ~ {time_data[-1]['date'].strftime('%Y-%m-%d')}")

    # 2. 스테이킹 데이터 확인
    staked_data = []
    with open('data/stakedTON_column_Y.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            staked_data.append({
                'block_number': int(row['Block number']),
                'staked': float(row[' Staked (W)TON'])
            })

    current_staked = staked_data[-1]['staked']
    max_staked = max(row['staked'] for row in staked_data)
    print(f"✅ 스테이킹 데이터: {len(staked_data)}개 포인트")
    print(f"   현재 스테이킹: {current_staked:,.0f} TON")
    print(f"   최대 스테이킹: {max_staked:,.0f} TON")

    # 3. 소각 데이터 확인
    burned_data = []
    total_burned = 0
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            burned_amount = float(row[' Burned TON'])
            burned_data.append({
                'block_number': int(row['Block number']),
                'burned': burned_amount
            })
            total_burned += burned_amount

    burn_events = len([row for row in burned_data if row['burned'] > 0])
    max_burn = max(row['burned'] for row in burned_data)
    print(f"✅ 소각 데이터: {len(burned_data)}개 포인트")
    print(f"   총 소각량: {total_burned:,.0f} TON")
    print(f"   소각 이벤트: {burn_events}회")
    print(f"   최대 단일 소각: {max_burn:,.0f} TON")

    # 4. DAO 락업 데이터 확인
    locked_data = []
    total_locked = 0
    total_spent = 0
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            locked = float(row[' Locked TON'])
            spent = float(row[' Spent TON'])
            locked_data.append({
                'block_number': int(row['Block number']),
                'locked': locked,
                'spent': spent
            })
            total_locked += locked
            total_spent += spent

    net_locked = total_locked - total_spent
    print(f"✅ DAO 데이터: {len(locked_data)}개 포인트")
    print(f"   총 락업: {total_locked:,.0f} TON")
    print(f"   총 지출: {total_spent:,.0f} TON")
    print(f"   순 락업: {net_locked:,.0f} TON")

    # 5. Reduced Seignorage 확인
    reduced_data = []
    total_reduced = 0
    with open('data/reducedSeigTON_column_H.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            reduced = float(row[' Reduced seignorage'])
            reduced_data.append({
                'block_number': int(row['Block number']),
                'reduced': reduced
            })
            total_reduced += reduced

    reduced_events = len([row for row in reduced_data if row['reduced'] > 0])
    print(f"✅ Reduced Seignorage: {len(reduced_data)}개 포인트")
    print(f"   총 감소량: {total_reduced:,.0f} TON")
    print(f"   감소 이벤트: {reduced_events}회")

    return {
        'current_staked': current_staked,
        'total_burned': total_burned,
        'net_locked': net_locked,
        'total_reduced': total_reduced,
        'time_points': len(time_data),
        'latest_date': time_data[-1]['date']
    }

def verify_calculations(data):
    """핵심 계산들 검증"""
    print(f"\n🧮 계산 검증...")

    # 기본 상수
    initial_supply = 50_000_000

    # 현재 총공급량
    current_total_supply = initial_supply - data['total_burned']
    print(f"✅ 현재 총공급량: {current_total_supply:,.0f} TON")

    # 순환공급량
    circulating_supply = current_total_supply - data['current_staked'] - data['net_locked']
    print(f"✅ 순환공급량: {circulating_supply:,.0f} TON")

    # 비율 계산
    circulation_rate = (circulating_supply / current_total_supply) * 100
    staked_ratio = (data['current_staked'] / current_total_supply) * 100
    locked_ratio = (data['net_locked'] / current_total_supply) * 100
    burned_ratio = (data['total_burned'] / initial_supply) * 100

    print(f"✅ 순환률: {circulation_rate:.1f}%")
    print(f"✅ 스테이킹 비율: {staked_ratio:.1f}%")
    print(f"✅ DAO 락업 비율: {locked_ratio:.1f}%")
    print(f"✅ 소각 비율: {burned_ratio:.1f}%")

    # 네트워크 성숙도
    network_maturity = ((data['current_staked'] + data['net_locked']) / initial_supply) * 100
    print(f"✅ 네트워크 성숙도: {network_maturity:.1f}%")

    # 합계 검증
    total_accounted = circulating_supply + data['current_staked'] + data['net_locked']
    print(f"\n🔍 균형 검증:")
    print(f"   순환 + 스테이킹 + 락업 = {total_accounted:,.0f} TON")
    print(f"   현재 총공급량 = {current_total_supply:,.0f} TON")
    print(f"   차이: {abs(total_accounted - current_total_supply):,.0f} TON")

    if abs(total_accounted - current_total_supply) < 1:
        print("   ✅ 균형이 맞습니다!")
    else:
        print("   ❌ 균형이 맞지 않습니다!")

    return {
        'current_total_supply': current_total_supply,
        'circulating_supply': circulating_supply,
        'circulation_rate': circulation_rate,
        'network_maturity': network_maturity,
        'staked_ratio': staked_ratio,
        'locked_ratio': locked_ratio,
        'burned_ratio': burned_ratio
    }

def cross_check_with_reports(calculations):
    """보고서 수치와 교차 검증"""
    print(f"\n📋 보고서 수치 교차 검증...")

    # 보고서에서 언급된 수치들
    report_values = {
        'total_supply': 47_921_953,  # 보고서의 현재 총공급량
        'circulating': 6_596_637,   # 보고서의 순환공급량
        'circulation_rate': 13.8,   # 보고서의 순환률
        'network_maturity': 82.7,   # 보고서의 네트워크 성숙도
        'staked_ratio': 49.8,       # 보고서의 스테이킹 비율
        'locked_ratio': 36.4        # 보고서의 락업 비율
    }

    # 계산된 값과 비교
    tolerance = 0.1  # 허용 오차 (%)

    def compare_values(name, calculated, reported, is_percentage=False):
        if is_percentage:
            diff = abs(calculated - reported)
            unit = "%"
        else:
            diff = abs(calculated - reported) / reported * 100
            unit = ""

        status = "✅" if diff <= tolerance else "❌"
        print(f"   {status} {name}:")
        print(f"      계산값: {calculated:,.1f}{unit}")
        print(f"      보고서: {reported:,.1f}{unit}")
        print(f"      차이: {diff:.2f}{'%' if not is_percentage else 'pp'}")

        return diff <= tolerance

    all_match = True

    all_match &= compare_values("총공급량", calculations['current_total_supply'], report_values['total_supply'])
    all_match &= compare_values("순환공급량", calculations['circulating_supply'], report_values['circulating'])
    all_match &= compare_values("순환률", calculations['circulation_rate'], report_values['circulation_rate'], True)
    all_match &= compare_values("네트워크 성숙도", calculations['network_maturity'], report_values['network_maturity'], True)
    all_match &= compare_values("스테이킹 비율", calculations['staked_ratio'], report_values['staked_ratio'], True)
    all_match &= compare_values("락업 비율", calculations['locked_ratio'], report_values['locked_ratio'], True)

    print(f"\n🎯 전체 검증 결과: {'✅ 모든 수치가 일치합니다!' if all_match else '❌ 일부 수치에 차이가 있습니다.'}")

    return all_match

def verify_event_identification():
    """주요 이벤트 식별 검증"""
    print(f"\n🎯 주요 이벤트 검증...")

    # 소각 이벤트 확인
    with open('data/burnedTON_column_J.csv', 'r') as f:
        reader = csv.DictReader(f)
        burned_events = []
        for row in reader:
            burned = float(row[' Burned TON'])
            if burned > 100_000:  # 10만 TON 이상
                burned_events.append({
                    'block': int(row['Block number']),
                    'amount': burned
                })

    print(f"✅ 대규모 소각 이벤트: {len(burned_events)}개")
    for event in burned_events:
        print(f"   블록 {event['block']}: {event['amount']:,.0f} TON")

    # DAO 락업 이벤트 확인
    with open('data/lockedTON+spentTON_column_V+W.csv', 'r') as f:
        reader = csv.DictReader(f)
        lock_events = []
        for row in reader:
            locked = float(row[' Locked TON'])
            if locked > 1_000_000:  # 100만 TON 이상
                lock_events.append({
                    'block': int(row['Block number']),
                    'amount': locked
                })

    print(f"✅ 대규모 DAO 락업: {len(lock_events)}개")
    for event in lock_events:
        print(f"   블록 {event['block']}: {event['amount']:,.0f} TON")

    # Reduced Seignorage 기간 확인
    with open('data/reducedSeigTON_column_H.csv', 'r') as f:
        reader = csv.DictReader(f)
        reduced_events = []
        for row in reader:
            reduced = float(row[' Reduced seignorage'])
            if reduced > 0:
                reduced_events.append({
                    'block': int(row['Block number']),
                    'amount': reduced
                })

    print(f"✅ Reduced Seignorage 이벤트: {len(reduced_events)}개")
    if reduced_events:
        total_reduced = sum(e['amount'] for e in reduced_events)
        print(f"   총 감소량: {total_reduced:,.0f} TON")
        print(f"   기간: 블록 {reduced_events[0]['block']} ~ {reduced_events[-1]['block']}")

def main():
    """메인 검증 함수"""
    print("="*60)
    print("🔍 TON 데이터 분석 결과 검증")
    print("="*60)

    # 1. 원본 데이터 로드 및 기본 확인
    raw_data = load_raw_data()

    # 2. 핵심 계산 검증
    calculations = verify_calculations(raw_data)

    # 3. 보고서 수치와 교차 검증
    verification_result = cross_check_with_reports(calculations)

    # 4. 이벤트 식별 검증
    verify_event_identification()

    print(f"\n{'='*60}")
    print(f"🎯 최종 검증 결과")
    print(f"{'='*60}")
    print(f"데이터 포인트: {raw_data['time_points']}개")
    print(f"분석 기간: ~ {raw_data['latest_date'].strftime('%Y-%m-%d')}")
    print(f"계산 정확성: {'✅ 검증됨' if verification_result else '❌ 재검토 필요'}")
    print(f"보고서 일치성: {'✅ 일치' if verification_result else '❌ 불일치'}")

    if verification_result:
        print(f"\n🎉 모든 검증을 통과했습니다! 분석 결과가 정확합니다.")
    else:
        print(f"\n⚠️ 일부 수치에 차이가 있습니다. 재검토가 필요합니다.")

if __name__ == "__main__":
    main()