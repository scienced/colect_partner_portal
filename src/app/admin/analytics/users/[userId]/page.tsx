import { UserAnalyticsDetail } from "./UserAnalyticsDetail"

export default async function UserAnalyticsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  return <UserAnalyticsDetail userId={userId} />
}
