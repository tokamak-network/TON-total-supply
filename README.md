# TON Total Supply

This repository contains JavaScript files related to the TON (Tokamak Network) total supply calculations.

## Files

- `main.js`: Main file for TON total supply and circulating supply. See outputs for the results.
- `updateCSV.js`: File for updating CSV data related to TON total supply.
- `burnedTON.js`: File for calculating the burned TON tokens at 0x0000...0001.
- `burnedSeignorage.js`: File for calculating the burned seignorage of TON due to unstaking before seignorage is updated.
- `reducedSeignorage.js`: File for calculating the reduced seignorage of TON due to a DAO directive that reduced PowerTON seignorage rate from 10% to 5%.
- `lockedTON.js`: File for calculating the locked TON tokens in DAO vault.
- `stakedTON.js`: File for calculating the staked TON tokens in Seigmanger. The file accounts for the fact that the seigmanager contract was patched due to vulnerability.

## Data Folder

The `data` folder contains outputs from the `main.js` file. These files are used to update the TON supply spreadsheet, which can be found [here](https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit?usp=sharing).

## Usage

To use this project, follow these steps:

1. Create a `.env` file. See `.env_example` file to see what to add.
2. Install the required dependencies.
3. Run the command: `node main.js`.

## Contributing

If you find any issues or have suggestions for improvements, feel free to open an issue or submit a pull request. Contributions are always welcome!

## License

This project is licensed under the [MIT License](LICENSE).
