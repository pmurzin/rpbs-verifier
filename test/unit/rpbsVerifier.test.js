const { assert, expect } = require("chai")
const { deployments, ethers } = require("hardhat")

const { developmentChains } = require("../../helper-hardhat-config")

const { rpbs, curveOperations } = require("@blockswaplab/blind-signer")
const sha256 = require("js-sha256")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RpbsVerifier", function () {
          let rpbsVerifier
          let deployer

          let publicKey
          let unblindedSig
          let messageHash
          let info
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              rpbsVerifier = await ethers.getContract("RpbsVerifier", deployer)

              //   // Preparations:

              const privateKey = curveOperations.getRandomScalar()
              publicKey = curveOperations.getCurvePoint(privateKey)

              info = "114514"
              const message = "1B8141A468B1105"

              messageHash = sha256.hex(message)
              const messagePoint =
                  curveOperations.getCurvePointFromHash(messageHash)

              const signatureCommitment = rpbs.commitToSignature(
                  messagePoint,
                  info,
                  privateKey
              )
              const challenge = rpbs.computeChallenge(
                  signatureCommitment,
                  messagePoint,
                  info,
                  publicKey
              )
              const solution = rpbs.solveChallenge(
                  challenge,
                  signatureCommitment,
                  privateKey
              )

              /// challenge, challengeSolution, commitment, publicKey, message, info
              unblindedSig = rpbs.unblindSignature(
                  challenge,
                  solution,
                  signatureCommitment,
                  publicKey,
                  messagePoint,
                  info
              )

              if (!unblindedSig) {
                  throw Error("Invalid unblinding")
              }

              const valid = rpbs.verifySignature(
                  publicKey,
                  info,
                  unblindedSig,
                  challenge.m1Hat
              )

              expect(valid).to.be.true
          })

          describe("verifyRpbsSignature", function () {
              it("Onchain RPBS Signature verification with valid/invalid parameters from Offchain RPBS library - OK", async function () {
                  const key = {
                      x: publicKey.getX().toString(),
                      y: publicKey.getY().toString(),
                  }

                  const infoHash = sha256.hex(info)

                  const signature = {
                      z1_hat: {
                          x: unblindedSig.z1Hat.getX().toString(),
                          y: unblindedSig.z1Hat.getY().toString(),
                      },
                      c1_hat: unblindedSig.c1Hat.toString(),
                      s1_hat: unblindedSig.s1Hat.toString(),
                      c2_hat: unblindedSig.c2Hat.toString(),
                      s2_hat: unblindedSig.s2Hat.toString(),
                      alpha: unblindedSig.alpha.toString(),
                      beta: unblindedSig.beta.toString(),
                  }

                  const isValid1 = await rpbsVerifier.verifySignature(
                      key,
                      "0x" + infoHash,
                      signature,
                      "0x" + messageHash
                  )

                  expect(isValid1).to.be.true

                  const isValid2 = await rpbsVerifier.verifySignature(
                      key,
                      "0x" + infoHash,
                      signature,
                      "0x" +
                          Buffer.from(ethers.utils.randomBytes(32)).toString(
                              "hex"
                          )
                  )

                  expect(isValid2).to.be.false
              })
          })
      })
