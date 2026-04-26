import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useTheme } from '@/lib/hooks'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()
  const theme = useTheme()

  if (isSignedIn) {
    return <Redirect href={'/'} />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.primary },
        animation: 'fade',
      }}
    />
  )
}