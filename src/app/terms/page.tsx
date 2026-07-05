import type { Metadata } from 'next'
import { LegalLayout, LegalSection, LegalList } from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Terms of Service · AnglerIQ',
  description: 'The terms governing your use of AnglerIQ.',
}

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      effectiveDate="[EFFECTIVE DATE]"
      intro={
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the AnglerIQ website and application at
          getangleriq.com (the &ldquo;Service&rdquo;), operated by <strong>[COMPANY LEGAL NAME]</strong>
          (&ldquo;AnglerIQ,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account or
          using the Service, you agree to these Terms. If you do not agree, do not use the Service.
        </p>
      }
    >
      <LegalSection heading="1. Eligibility">
        <p>
          You must be at least 18 years old and able to form a binding contract to use the Service. By using the
          Service, you represent that you meet these requirements.
        </p>
      </LegalSection>

      <LegalSection heading="2. The Service">
        <p>
          AnglerIQ provides bass-fishing intelligence — aggregated tournament and technique data, AI-generated
          reports, recommendations, conditions, and related tools — for informational and entertainment purposes.
          Recommendations are predictions, not guarantees. We do not promise any particular fishing result, catch, or
          outcome.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts">
        <p>
          You are responsible for the information you provide, for maintaining the security of your account and
          credentials, and for all activity under your account. Notify us promptly of any unauthorized use. You may
          sign in with email or with a third-party provider such as Google, subject to that provider&rsquo;s terms.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions, billing, and cancellation">
        <LegalList items={[
          'AnglerIQ may offer a free trial and paid subscription plans. Current pricing is shown in the app and may change with notice.',
          'Paid subscriptions are billed in advance on a recurring basis through our payment processor, Stripe, and renew automatically until cancelled.',
          'You can cancel at any time from your Account page via "Manage Billing" / "Cancel subscription," which opens the Stripe customer portal. Cancellation takes effect at the end of the current billing period, and you retain access until then.',
          'Except where required by law, payments are non-refundable and we do not provide refunds or credits for partial periods.',
          'We may change prices or plan features prospectively; continued use after a change takes effect constitutes acceptance.',
        ]} />
      </LegalSection>

      <LegalSection heading="5. Your content">
        <p>
          You retain ownership of the content you submit, including your fishing logs, notes, and photos (&ldquo;Your
          Content&rdquo;). You grant us a limited, non-exclusive license to store, process, and display Your Content
          solely to operate and improve the Service for you. You represent that you have the rights to the content you
          upload and that it does not violate any law or third-party right.
        </p>
      </LegalSection>

      <LegalSection heading="6. Acceptable use">
        <p>You agree not to:</p>
        <LegalList items={[
          'Use the Service for any unlawful purpose or in violation of these Terms.',
          'Scrape, copy, resell, or redistribute data or reports from the Service except as expressly permitted.',
          'Attempt to reverse engineer, disrupt, overload, or gain unauthorized access to the Service or its systems.',
          'Upload content that is unlawful, infringing, or harmful, or that you do not have the right to share.',
        ]} />
      </LegalSection>

      <LegalSection heading="7. AI-generated content">
        <p>
          Reports, chat responses, and recommendations are generated in part by artificial intelligence using
          aggregated data and current conditions. They may be incomplete, out of date, or inaccurate. Use your own
          judgment and do not rely on the Service as your sole source of information for any decision.
        </p>
      </LegalSection>

      <LegalSection heading="8. Fishing laws, licenses, and safety">
        <p>
          You are solely responsible for complying with all applicable fishing regulations, licensing requirements,
          catch and size limits, seasons, and access rules, and for your own safety on and around the water. Weather,
          water-level, and conditions data are provided by third parties, may be delayed or inaccurate, and must not be
          relied upon for safety or navigation decisions. Always verify current regulations and conditions with
          official sources.
        </p>
      </LegalSection>

      <LegalSection heading="9. Intellectual property">
        <p>
          The Service, including its software, design, and aggregated content (excluding Your Content), is owned by
          AnglerIQ and its licensors and is protected by intellectual property laws. We grant you a limited,
          revocable, non-transferable license to use the Service for your personal, non-commercial use.
        </p>
      </LegalSection>

      <LegalSection heading="10. Third-party services">
        <p>
          The Service relies on third-party providers (including Supabase, Vercel, Stripe, Anthropic, Resend, and
          Google) and may link to third-party content. We are not responsible for third-party services or content, and
          your use of them may be governed by their own terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY
          INFORMATION OR RECOMMENDATION WILL BE ACCURATE OR PRODUCE ANY PARTICULAR RESULT.
        </p>
      </LegalSection>

      <LegalSection heading="12. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ANGLERIQ AND ITS OWNERS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, OR GOODWILL,
          ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT
          EXCEED THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM, OR US$100 IF YOU PAID NOTHING.
        </p>
      </LegalSection>

      <LegalSection heading="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless AnglerIQ and its owners from any claims, damages, or expenses
          arising out of your use of the Service, Your Content, or your violation of these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="14. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate access if you
          violate these Terms or to protect the Service. Provisions that by their nature should survive termination
          will survive.
        </p>
      </LegalSection>

      <LegalSection heading="15. Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of <strong>[STATE]</strong>, without regard to conflict-of-law
          rules. Any dispute will be resolved in the state or federal courts located in <strong>[COUNTY/STATE]</strong>,
          and you consent to their jurisdiction. <span className="text-slate-400">[Optional: arbitration / class-action
          waiver clause to be added on advice of counsel.]</span>
        </p>
      </LegalSection>

      <LegalSection heading="16. Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will post the updated version here and revise the
          &ldquo;Effective date&rdquo; above. Continued use after changes take effect constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection heading="17. Contact">
        <p>
          Questions about these Terms? Contact <strong>[COMPANY LEGAL NAME]</strong> at <strong>[CONTACT EMAIL]</strong>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
