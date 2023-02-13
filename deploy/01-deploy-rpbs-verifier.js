const { network } = require("hardhat")

const { developmentChains } = require("../helper-hardhat-config")

const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = []
    const rpbsVerifier = await deploy("RpbsVerifier", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(rpbsVerifier.address, args)
    }

    log(
        "----------------------------------------------------------------------"
    )
}

module.exports.tags = ["all", "rpbsVerifier"]
