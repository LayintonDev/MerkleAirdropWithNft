
import * as fs from "fs";
import * as csv from "csv-parser";
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256';
import { ethers } from 'hardhat';

// import { StandardMerkleTree } from "@openzeppelin/merkle-tree";


// Define an array to hold the parsed values from the CSV file.
interface Row {
  address: string;
  index: string;
  amount: string;
}



// Read and parse the CSV file.
const parseCsv = (path: string): Promise<Row[]> => {
  return new Promise((resolve, reject) => {
    const values: Row[] = [];
    fs.createReadStream(path)
      .pipe(csv.default())
      .on("data", (row: Row) => {

        // Each row is pushed into the values array as an array of strings: [address, index, amount].
        if (!!row?.address && !!row.index && !!row.amount)
          values.push({
            address: row?.address,
            index: row?.index,
            amount: row?.amount
          });


      })
      .on("end", () => {
        resolve(values);
        console.log("Ended")
      }).on("error", (err) => {
        reject(err)
      });


  })
}
function performKeccakHash(address: string, index: string, amount: string): Buffer {
  return keccak256(
    ethers.solidityPacked(
      ["address", "uint256", "uint256"],
      [address, index, amount]
    )


  )
}

export const generateMerkleTree = async ({ path, proofAddr, proofAmount, proofIndex }: { path: string, proofAddr: string, proofAmount: string, proofIndex: string }) => {

  // Read and parse the CSV file.
  const values: Row[] = await parseCsv(path);
  const tree = new MerkleTree(
    values.map((row) => performKeccakHash(row.address, row.index, row.amount)),
    keccak256,
    { sort: true }
  );
  const root = tree.getHexRoot();


  const proof = tree.getHexProof(performKeccakHash(proofAddr, proofIndex, proofAmount));

  console.log({
    root,
    leaf: performKeccakHash(proofAddr, proofIndex, proofAmount),
    proof
  })
  console.log(tree.verify(proof, performKeccakHash(proofAddr, proofIndex, proofAmount), root))
  return { root, leaf: performKeccakHash(proofAddr, proofIndex, proofAmount), proof };
}

const main = async () => {
  const { root, proof } = await generateMerkleTree({
    path: "addresses.csv",
    proofAddr: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    proofAmount: "40000000000000000000",
    proofIndex: "2"
  });
  console.log({ root, proof });
  // true
}

// main().then(() => process.exit())