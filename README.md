# TON-total-supply file explanation
 1. main.js: Calculate TON total supply at specfic block based on the actual minted amount -> this is not an accurate figure for Total supply.
 2. reducedSeigRateCalculate.js: Calculated reduced seignorage due to seignorage rate change

# to run, copy paste it in the terminal
git clone https://github.com/tokamak-network/TON-total-supply.git
node main.js 
node reducedSeigRateCalculate.js

# Result for reduced seignorage: 
- 178111.66690985573 (W)TON has been not minted due to seignorage rate change 

# Accurate way to calculate total supply
if target block > 13484668 
- Total Supply = 50,000,000 + 3.92*(target block # - 10837698) - TON in 0x0..1 - 178111.66690985573

if target block < 12358829
- Total Supply = 50,000,000 + 3.92*(target block # - 10837698) - TON in 0x0..1
