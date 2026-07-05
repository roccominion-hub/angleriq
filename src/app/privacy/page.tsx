import type { Metadata } from 'next'
import { LegalLayout, LegalSection, LegalList } from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy · AnglerIQ',
  description: 'How AnglerIQ collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effectiveDate="[EFFECTIVE DATE]"
      intro={
        <p>
          This Privacy Policy explains how <strong>[COMPANY LEGAL NAME]</strong> (&ldquo;AnglerIQ,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares information when you use
          the AnglerIQ website and application at getangleriq.com (the &ldquo;Service&rdquo;). By using the Service,
          you agree to the practices described here.
        </p>
      }
    >
      <LegalSection heading="1. Information we collect">
        <p>We collect the following categories of information:</p>
        <LegalList items={[
          <><strong>Account information.</strong> When you create an account, we collect your email address and, if you sign up with Google, your name and profile photo. You may also add a display name and avatar.</>,
          <><strong>Fishing preferences.</strong> Your home state, preferred bait types, fishing style, and boat access, which you can set and change at any time.</>,
          <><strong>Fishing logs and content.</strong> Trips you log — including lakes, dates, specific spots (which may include approximate GPS coordinates you enter), water and weather conditions, techniques, baits, catches, ratings, notes, and any photos you upload.</>,
          <><strong>Saved reports.</strong> Fishing intelligence reports you choose to save to your account.</>,
          <><strong>Payment information.</strong> If you subscribe, payments are processed by Stripe. We do not receive or store your full card number. We store a Stripe customer identifier and your subscription status.</>,
          <><strong>Usage information.</strong> Basic activity such as the number of reports you have generated and your last active time, used to operate the Service and enforce trial and subscription limits.</>,
          <><strong>Authentication data.</strong> We use secure session cookies to keep you signed in. We do not use third-party advertising or analytics cookies.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <LegalList items={[
          'Provide, maintain, and improve the Service, including generating fishing intelligence reports and recommendations.',
          'Personalize your experience using your preferences and your own logged trips.',
          'Create and manage your account, process subscriptions, and prevent abuse.',
          'Send you service-related emails (for example, account, security, and billing notices).',
          'Comply with legal obligations and enforce our Terms of Service.',
        ]} />
      </LegalSection>

      <LegalSection heading="3. AI processing">
        <p>
          AnglerIQ uses artificial intelligence to generate fishing reports and to power the &ldquo;Ask AnglerIQ&rdquo;
          chat. To do this, we send relevant inputs — such as your question, the lake and conditions, and, where
          relevant, a summary of your own logged trips — to our AI provider (Anthropic) for processing. This data is
          used to generate your response and is not used by our AI provider to train its models under our commercial
          API terms. We do not sell your information or use it for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="4. Service providers">
        <p>We share information with third-party providers only as needed to run the Service:</p>
        <LegalList items={[
          <><strong>Supabase</strong> — database, authentication, and file storage (including uploaded photos and avatars).</>,
          <><strong>Vercel</strong> — application hosting and delivery.</>,
          <><strong>Stripe</strong> — subscription billing and payment processing.</>,
          <><strong>Anthropic</strong> — AI processing for reports and chat, as described above.</>,
          <><strong>Resend</strong> — delivery of transactional email.</>,
          <><strong>Google</strong> — optional sign-in if you choose &ldquo;Continue with Google.&rdquo;</>,
        ]} />
        <p>
          These providers are bound by their own terms and privacy commitments and may process data in the United
          States. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="5. Photos and location">
        <p>
          Photos you upload to a fishing log are stored in our file storage and may be accessible via a link. Any spot
          coordinates or location details are those you choose to enter; we recommend not recording precise locations
          you wish to keep private. You can edit or delete your logs and photos at any time.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data retention and deletion">
        <p>
          We keep your information for as long as your account is active. You can delete your account at any time from
          your Account page, which removes your profile, saved reports, and associated data. Some records may be
          retained where required for legal, tax, or fraud-prevention purposes, or in routine backups for a limited
          period.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights and choices">
        <p>
          Depending on where you live, you may have rights to access, correct, export, or delete your personal
          information, and to object to or restrict certain processing. You can exercise many of these directly in the
          app (editing your profile and logs, or deleting your account), or by contacting us at{' '}
          <strong>[CONTACT EMAIL]</strong>. We will not discriminate against you for exercising these rights. We do not
          sell personal information as defined under applicable U.S. state privacy laws.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          We use industry-standard measures — including encrypted connections and access controls provided by our
          infrastructure partners — to protect your information. No method of transmission or storage is completely
          secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children's privacy">
        <p>
          The Service is intended for adults and is not directed to children under 18. We do not knowingly collect
          personal information from children under 18. If you believe a child has provided us information, contact us
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the updated version here and revise the
          &ldquo;Effective date&rdquo; above. Material changes may also be communicated by email or in-app notice.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact us">
        <p>
          Questions about this Privacy Policy or your data? Contact <strong>[COMPANY LEGAL NAME]</strong> at{' '}
          <strong>[CONTACT EMAIL]</strong>{' '}<span className="text-slate-400">[· mailing address to be added]</span>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
