import { AuthForm } from "@/components/auth-form"
import { LandingHeader } from "@/components/landing-header"


export default function SignupPage() {
  return (
    <>
      <LandingHeader />
      <AuthForm mode="signup" />
    </>
  )
}
