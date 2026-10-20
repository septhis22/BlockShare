To start the project:

1. Run `npm i` in `frontend`, `backend`, and `smart-contracts`.
2. Configure the backend environment with `MONGO_URI`, `JWT_SECRET`, and
   `PINATA_JWT`. For Atlas, use this URI shape in `backend/.env`:

   ```env
   MONGO_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@cluster0.iw77pko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   MONGO_DB_NAME=BlockShare
   ```

   Replace `DB_USER` and `URL_ENCODED_PASSWORD` with your Atlas database
   credentials; do not include placeholder brackets or a `..` path. Percent-encode
   special characters in the password. MongoDB defaults to the `BlockShare`
   database; set `MONGO_DB_NAME` to override it. `JWT_SECRET` should be a long
   random value.
   Keep `PINATA_JWT` only in the backend environment; it must not be added to
   frontend `VITE_` variables. Encrypted file uploads use Pinata's public IPFS
   network, so the uploaded ciphertext is publicly addressable by CID.
3. From the project root in PowerShell, run `./start-dev.ps1`. The launcher
   opens a local Hardhat chain, deploys `Registry`
   and `WalletTextRegistry` to it, then starts the backend and frontend dev
   servers in separate terminal windows. It expects dependencies to be installed
   in all three folders as described in step 1.

To start the services manually instead, run `npm run dev` from `frontend` and
`backend`, run `npx hardhat node` from `smart-contracts`, then deploy the
contracts in this order from `smart-contracts`:

```sh
npx hardhat run scripts/deployRegistry.ts --network localhost
npx hardhat run scripts/deployWalletTextRegistry.ts --network localhost
```

The backend maps its Mongoose models to the existing MongoDB collections
`User` and `Files`. Authenticated API routes are mounted under `/api/auth`
(signup, login, profile, recipient lookup, key-phrase retrieval/rotation, and
wallet encryption-key registration) and `/api/shared` (ciphertext upload,
share registration, received/sent lists, and legacy GridFS download). Upload
metadata and share metadata are stored together in `Files`. Registration and
login require MetaMask in the frontend. The backend stores each user's random
`key_phrase`; after signing it, the frontend stores the derived secp256k1
public key and wallet address on the `User` document. The corresponding private
key stays in frontend memory and is not persisted.
