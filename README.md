To start Project :
step 1: Goes to all the folder(frontend,backend,smart-contracts) and run ( npm i )
step 2: go to frontend and backend, in terminal run ( npm run dev ) on two seperate terminal for both.
step 3: open a third terminal and run :
  npx hardhat node   // to start the local blockchain
step 4: open a 4th terminal
  cd smart-contracts
  npx hardhat run scripts/deployRegistry.ts --network localhost    // to deploy the smart contract on it
