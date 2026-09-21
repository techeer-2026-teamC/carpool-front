function shorten(name, limit) {
  if (name.length <= limit) return name
  // Do not split an emoji's surrogate pair at the display boundary.
  return `${name.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, '')}…`
}

function routeTitle(origin, destination) {
  const originLimit = Math.max(48, 97 - destination.length)
  const destinationLimit = 97 - Math.min(origin.length, originLimit)
  return `${shorten(origin, originLimit)} → ${shorten(destination, destinationLimit)}`
}

export function buildPostPayload({ post, frozen, type, origin, destination, date, time, capacity, price, description }) {
  return {
    type, title: routeTitle(origin.name, destination.name),
    departureLocation: origin.name, departureLat: origin.lat, departureLng: origin.lng,
    destinationLocation: destination.name, destinationLat: destination.lat, destinationLng: destination.lng,
    departureTime: frozen ? post.departureTime : `${date}T${time}:00`,
    maxPassengers: Number(capacity), price: price === '' ? null : Number(price),
    description, autoAccept: false, tagIds: post?.tags?.map(tag => tag.id) || [],
  }
}
