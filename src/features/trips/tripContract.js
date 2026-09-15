export const sameMember = (left, right) => left != null && right != null && String(left) === String(right)
export const beforeCutoff = (post, now = Date.now()) => Boolean(post && !post.meetingCompletedAt && new Date(post.departureTime).getTime() > now)
