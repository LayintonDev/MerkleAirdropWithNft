import {
  loadFixture,
  time
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { generateMerkleTree } from "../scripts/generateMerkleTree";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

// Main test suite for the Airdrop contract
describe("Airdrop", function () {

  const AirDropEndingTimeInSec = time.duration.seconds(30 * 24 * 60 * 60);

  // Function to deploy the LayintonToken ERC-20 contract.
  async function deployLayiToken() {

    const [owner] = await ethers.getSigners();
    // Get the first signer, who will be the owner.
    const erc20Token = await ethers.getContractFactory("LayintonToken"); // Get contract factory for LayintonToken.
    const token = await erc20Token.deploy();  // Deploy the token contract.
    return { token, owner, };  // Return the deployed token and owner.
  }

  // Function to deploy the airdrop contract and create the Merkle tree for airdrop eligibility.
  async function delpoyLayiAirdropDrop() {
    const TOKEN_HOLDER = "0x6E404D8eBf475e196E0581Df3B5C1D43478ad40C";
    const NON_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";
    await helpers.impersonateAccount(TOKEN_HOLDER);
    await helpers.impersonateAccount(NON_HOLDER);
    const holder = await ethers.getSigner(TOKEN_HOLDER);
    const nonholder = await ethers.getSigner(NON_HOLDER);
    const { token } = await loadFixture(deployLayiToken);  // Load the deployed token.

    const [owner, other, addr1] = await ethers.getSigners();  // Get three accounts: owner, other, addr1.

    // // Array representing the list of addresses and their token claim amounts (in wei).
    // const values = [
    //   [addr1.address, "0", "70000000000000000000"], // addr1 can claim 70 tokens.
    //   ["0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", "1", "80000000000000000000"], // Another address, 80 tokens.
    //   ["0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", "2", "40000000000000000000"], // Another address, 40 tokens.
    //   ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "3", "10000000000000000000"], // Another address, 10 tokens.
    // ];



    // Get the Merkle root from the tree, which will be used to verify claims.
    const { root, proof, leaf } = await generateMerkleTree({
      path: "addresses.csv",
      proofAddr: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      proofAmount: "40000000000000000000",
      proofIndex: "2"
    });

    // Deploy the airdrop contract with the token address, Merkle root, and ending time.
    const LayiAirDrop = await ethers.getContractFactory("LayiAirDrop");
    const airdropAddress = await LayiAirDrop.deploy(token, root, AirDropEndingTimeInSec);

    // Return the deployed token, owner, other accounts, the airdrop contract, Merkle tree, and values.
    console.log(root)
    return { token, owner, holder, nonholder, leaf, other, airdropAddress, root, addr1, proof };
  }

  // Test suite to check LayintonToken deployment.
  describe("LayintonToken Deployment", function () {
    it("Should check that it has the correct number of tokens minted", async function () {
      const { token } = await loadFixture(deployLayiToken);  // Load the token contract.

      const tokents = ethers.parseUnits("500000", 18);  // Define the expected total supply (500,000 tokens with 18 decimals).

      expect(await token.totalSupply()).to.equal(tokents);  // Check that the token supply matches the expected value.
    });
  });

  // Test suite to check airdrop deployment.
  describe("LayitonAirdrop Deployment", function () {
    it("Should set the correct Merkle root", async function () {
      const { airdropAddress, root } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract and Merkle tree.
      expect(await airdropAddress.merkleRoot()).to.equal(root);  // Check that the Merkle root is correctly set in the contract.
    });

    it("Should set the correct token address", async function () {
      const { token, airdropAddress } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
      expect(token).to.equal(await airdropAddress.tokenAddress());  // Check that the token address is correctly set.
    });

    it("Should have the correct owner", async function () {
      const { owner, airdropAddress } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
      expect(owner.address).to.equal(await airdropAddress.owner());  // Verify that the owner of the airdrop contract matches the expected address.
    });
  });

  // Test suite to check the functionality of the airdrop.
  describe("Airdrop functionality", function () {
    it("Should claim airdrop if the user has required nft", async function () {
      const { token, airdropAddress, root, leaf, holder, proof, addr1 } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract and Merkle tree.
      const tokens = ethers.parseUnits("100000", 18);  // Define the amount of tokens to be transferred to the airdrop contract (100,000 tokens).

      // Transfer tokens from the owner to the airdrop contract.
      await token.transfer(airdropAddress, tokens);


      const amount = ethers.parseUnits("40", 18);  // Define the amount of tokens addr1 can claim (40 tokens).

      // addr1 claims their airdrop using the Merkle proof, the index, and the amount.
      await airdropAddress.connect(holder).claimAirDrop(proof, leaf, 6, amount);

      expect(await token.balanceOf(holder.address)).to.equal(amount);  // Check that addr1's balance matches the claimed amount.
    });

    it("Should revert if non holder of nft tries to claim airdrop ", async function () {
      const { token, airdropAddress, root, leaf, holder, proof, addr1 } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract and Merkle tree.
      const tokens = ethers.parseUnits("100000", 18);

      // Transfer tokens from the owner to the airdrop contract.
      await token.transfer(airdropAddress, tokens);


      const amount = ethers.parseUnits("40", 18);


      await expect(airdropAddress.connect(addr1).claimAirDrop(proof, leaf, 2, amount)).to.be.revertedWithCustomError(airdropAddress, "YouDonNotOwnRequiredNft");

      // expect(await token.balanceOf(holder.address)).to.equal(amount);  
    });

    it("Should not be able to claim airdrop twice", async function () {
      const { token, airdropAddress, root, leaf, holder, proof, addr1 } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
      const tokens = ethers.parseUnits("100000", 18);  // Define the amount of tokens for the airdrop contract.

      // Transfer tokens to the airdrop contract.
      await token.transfer(airdropAddress, tokens);




      const amount = ethers.parseUnits("40", 18);  // Define the claimable amount.

      // holder claims the airdrop once.
      await airdropAddress.connect(holder).claimAirDrop(proof, leaf, 2, amount);

      expect(await token.balanceOf(holder.address)).to.equal(amount);  // Check that the balance is correct.

      // Try to claim the airdrop again (which should fail).
      expect(airdropAddress.connect(holder).claimAirDrop(proof, leaf, 0, amount)).to.be.revertedWithCustomError(airdropAddress, "AirDropAlreadyClaimed");
    });

  });

  //   it("Should revert claim if claiming time already passed", async function () {
  //     const { token, airdropAddress, tree, addr1 } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
  //     const tokens = ethers.parseUnits("100000", 18);  // Transfer tokens to the airdrop contract.

  //     await token.transfer(airdropAddress, tokens);

  //     let proof;
  //     for (const [i, v] of tree.entries()) {
  //       if (v[0] === addr1.address) {
  //         proof = tree.getProof(i);  // Generate the Merkle proof for addr1.
  //         break;
  //       }
  //     }

  //     const amount = ethers.parseUnits("70", 18);  // Define the claimable amount.

  //     // Fast-forward time to after the airdrop has ended.
  //     await time.increase(AirDropEndingTimeInSec * 2);

  //     // Try to claim the airdrop (which should fail due to time expiration).
  //     expect(airdropAddress.connect(addr1).claimAirDrop(proof!, 0, amount)).to.be.revertedWithCustomError(airdropAddress, "ClaimingTimeAlreadyPassed");
  //   });

  //   it("Should revert if non-owner tries to withdraw remaining tokens", async function () {
  //     const { token, airdropAddress, addr1 } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
  //     const tokens = ethers.parseUnits("100000", 18);  // Transfer tokens to the airdrop contract.

  //     await token.transfer(airdropAddress, tokens);

  //     // addr1 (non-owner) attempts to withdraw the remaining tokens (which should fail).
  //     expect(airdropAddress.connect(addr1).withdrawRemainingToken()).to.be.revertedWithCustomError(airdropAddress, "NotOwner");
  //   });

  //   it("Should revert if owner tries to withdraw when airdrop is still active", async function () {
  //     const { token, airdropAddress } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
  //     const tokens = ethers.parseUnits("100000", 18);  // Transfer tokens to the airdrop contract.

  //     await token.transfer(airdropAddress, tokens);

  //     // Owner tries to withdraw the remaining tokens before the airdrop ends (which should fail).
  //     expect(airdropAddress.withdrawRemainingToken()).to.be.revertedWithCustomError(airdropAddress, "AirdropIsStillActive");
  //   });

  //   it("Should allow owner to withdraw remaining tokens when airdrop is over", async function () {
  //     const { token, owner, airdropAddress } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.
  //     const tokens = ethers.parseUnits("500000", 18);  // Transfer a large number of tokens to the airdrop contract.

  //     await token.transfer(airdropAddress, tokens);

  //     // Fast-forward time to after the airdrop has ended.
  //     await time.increase(AirDropEndingTimeInSec * 2);

  //     const remainingBal = await token.balanceOf(airdropAddress);  // Check the remaining balance of the airdrop contract.

  //     // Owner withdraws the remaining tokens.
  //     await airdropAddress.withdrawRemainingToken();

  //     expect(await token.balanceOf(owner.address)).to.equal(remainingBal);  // Check that the owner has received the remaining balance.
  //     expect(await token.balanceOf(airdropAddress)).to.equal(0);  // Check that the airdrop contract has no remaining tokens.
  //   });

  //   it("Should allow only the owner to update the Merkle root", async function () {
  //     const { airdropAddress, addr1, other } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.

  //     // Define a new set of values and generate a new Merkle tree.
  //     const values = [
  //       [addr1.address, "0", "70000000000000000000"],
  //       [other.address, "1", "80000000000000000000"],
  //       ["0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", "2", "40000000000000000000"],
  //       ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "3", "10000000000000000000"],
  //     ];
  //     const tree = StandardMerkleTree.of(values, ["address", "uint256", "uint256"]);
  //     const newMerkleRoot = tree.root;

  //     // Owner updates the Merkle root.
  //     await airdropAddress.updateMerkleRoot(newMerkleRoot);

  //     expect(await airdropAddress.merkleRoot()).to.equal(newMerkleRoot);  // Verify that the Merkle root is updated.
  //   });

  //   it("Should fail if a non-owner tries to update the Merkle root", async function () {
  //     const { airdropAddress, addr1, other } = await loadFixture(delpoyLayiAirdropDrop);  // Load the airdrop contract.

  //     // Define a new set of values and generate a new Merkle tree.
  //     const values = [
  //       [addr1.address, "0", "70000000000000000000"],
  //       [other.address, "1", "80000000000000000000"],
  //       ["0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", "2", "40000000000000000000"],
  //       ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "3", "10000000000000000000"],
  //     ];
  //     const tree = StandardMerkleTree.of(values, ["address", "uint256", "uint256"]);
  //     const newMerkleRoot = tree.root;

  //     // addr1 (non-owner) tries to update the Merkle root (which should fail).
  //     expect(airdropAddress.connect(addr1).updateMerkleRoot(newMerkleRoot)).to.be.revertedWithCustomError(airdropAddress, "NotOwner");
  //   });
  // });
});
