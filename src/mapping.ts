import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  GiveTo,
  Mint,
  PeopleLandV1,
  SetSlogan,
  Transfer,
} from "../generated/PeopleLandV1/PeopleLandV1"
import { TokenInfo, People } from "../generated/schema"

let ZeroAddress = Address.fromString("0x0000000000000000000000000000000000000000")

function getLandId(x: BigInt, y: BigInt): string {
  return x.toString() + "-" + y.toString()
}

function getPeople(address: Address): People {
  let people = People.load(address.toHexString())
  if (people == null) {
    people = new People(address.toHexString())
    people.save()
  }
  return people as People
}

function removePeopleLand(people: People, landId: string): void {
  if (people.lands.includes(landId)) {
    people.lands.splice(people.lands.findIndex(item => item === landId), 1)
    people.save()
  }
}

function addPeopleLand(people: People, landId: string): void {
  if (!people.lands.includes(landId)) {
    people.lands.push(landId)
    people.save()
  }
}

export function handleMint(event: Mint): void {

  let x = event.params.x
  let y = event.params.y
  let _id = getLandId(x, y)

  let tokenInfo = TokenInfo.load(_id)
  if (tokenInfo === null) {
    tokenInfo = new TokenInfo(_id)
    tokenInfo.x = x
    tokenInfo.y = y
    tokenInfo.minted = getPeople(event.params.mintedAddress).id
    tokenInfo.owner = getPeople(ZeroAddress).id
    tokenInfo.createdAtTimestamp = event.block.timestamp
    tokenInfo.createdAtBlockNumber = event.block.number
  }
  tokenInfo.save()
}

export function handleGiveTo(event: GiveTo): void {

  let contract = PeopleLandV1.bind(event.address)

  let x = event.params.x
  let y = event.params.y
  let _id = getLandId(x, y)

  let tokenInfo = TokenInfo.load(_id)
  let owner = getPeople(event.params.givedAddress)
  tokenInfo.owner = owner.id
  addPeopleLand(owner, _id)
  
  let tokenId = contract.getTokenId(x, y)
  let tokenURI = contract.tokenURI(tokenId)
  let land = contract.land(x, y)

  tokenInfo.tokenId = tokenId
  tokenInfo.tokenSvg = tokenURI
  tokenInfo.slogan = land.slogan
  tokenInfo.givedAtBlockNumber = event.block.number
  tokenInfo.givedAtTimestamp = event.block.timestamp

  let neighbors = contract.getNeighborsParams(x, y)
  tokenInfo.neighbors = neighbors.filter((n) => n !== null)
  tokenInfo.save()
}

export function handleTransfer(event: Transfer): void {
  let tokenId = event.params.tokenId
  let contract = PeopleLandV1.bind(event.address)
  let coor = contract.getCoordinates(tokenId)
  let x = coor.value0
  let y = coor.value1
  let _id = getLandId(x, y)

  let tokenInfo = TokenInfo.load(_id)

  if (tokenInfo === null) {
    tokenInfo = new TokenInfo(_id)
    tokenInfo.x = x
    tokenInfo.y = y
    tokenInfo.createdAtTimestamp = event.block.timestamp
    tokenInfo.createdAtBlockNumber = event.block.number
  }
  let owner = getPeople(event.params.to)
  tokenInfo.owner = owner.id
  
  tokenInfo.save()

  let from = getPeople(event.params.from)
  removePeopleLand(from, _id)
  addPeopleLand(owner, _id)
}

export function handleSetSlogan(event: SetSlogan): void {
  let _id = getLandId(event.params.x, event.params.y)
  let tokenInfo = TokenInfo.load(_id)
  tokenInfo.slogan = event.params.slogan
  tokenInfo.save()
}
