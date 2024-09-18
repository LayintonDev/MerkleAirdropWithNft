import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const AirDropEndingTimeInSec = time.duration.seconds(30 * 24 * 60 * 60);
const LayiTokenAddress = "0x809c4E72ac8e66226Fe23c5c4a2810B3821E28b2"
const LayiAirDropModule = buildModule("LayiAirDropModule", (m) => {
  const endingTime = m.getParameter("_endingTimeInsec", AirDropEndingTimeInSec);
  const layiTokenAddress = m.getParameter("_tokenAddress", LayiTokenAddress);
  const layiAirdrop = m.contract("LayiAirDrop", [endingTime, layiTokenAddress],);

  return { layiAirdrop };
});

export default LayiAirDropModule;