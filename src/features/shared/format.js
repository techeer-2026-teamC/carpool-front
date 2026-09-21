export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const won = amount => amount == null ? '현장 협의' : `${Number(amount).toLocaleString('ko-KR')}원`
export function departureLabel(value) {
  return new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
}
export const statusLabel = status => ({ PENDING: '승인 대기', ACCEPTED: '참여 확정', REJECTED: '승인 거절', CANCELLED: '신청 취소', OPEN: '모집 중', CLOSED: '모집 마감', MET: '만남 확인', NO_SHOW: '불참' }[status] || status)
export const typeLabel = type => type === 'TAXI' ? '택시 동승' : '출퇴근 카풀'
