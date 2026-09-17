import privacyPolicyRaw from '../../policies/privacy-policy.md?raw';
import termsOfUseRaw from '../../policies/terms-of-use.md?raw';
import communityGuidelinesRaw from '../../policies/community-guidelines.md?raw';

export interface PolicyDefinition {
  slug: 'privacy' | 'terms' | 'community-guidelines' | 'delete-account';
  title: string;
  shortTitle: string;
  effectiveDate?: string;
  description: string;
  rawContent: string;
}

export const POLICIES: Record<string, PolicyDefinition> = {
  privacy: {
    slug: 'privacy',
    title: 'Retrv Privacy Policy',
    shortTitle: 'Privacy Policy',
    effectiveDate: 'September 17, 2026',
    description: 'Learn what data we collect, how it is used, and your privacy choices.',
    rawContent: privacyPolicyRaw
  },
  terms: {
    slug: 'terms',
    title: 'Retrv Terms of Use',
    shortTitle: 'Terms of Use',
    effectiveDate: 'September 17, 2026',
    description: 'Terms governing your use of Retrv services and community features.',
    rawContent: termsOfUseRaw
  },
  'community-guidelines': {
    slug: 'community-guidelines',
    title: 'Retrv Community Guidelines',
    shortTitle: 'Community Guidelines',
    effectiveDate: 'September 17, 2026',
    description: 'Standards for safe, honest, and respectful community recovery.',
    rawContent: communityGuidelinesRaw
  },
  'delete-account': {
    slug: 'delete-account',
    title: 'Delete Account & Data',
    shortTitle: 'Delete Account',
    effectiveDate: 'September 17, 2026',
    description: 'Information regarding account and personal data deletion requests.',
    rawContent: `# Delete Account & Personal Data

**Effective Date:** September 17, 2026

Retrv is committed to user privacy and providing users with full control over their personal data.

## Account Deletion Policy

Users may request deletion of their Retrv account and associated personal information at any time.

In accordance with Google Play Store policies and applicable privacy laws, Retrv provides both in-app account deletion guidance and support channels for permanent data removal.

## Current Account Deletion Status

> [!NOTE]
> Automated self-service account deletion inside the application is currently scheduled for deployment prior to final Google Play publishing.

If you would like your account and all associated data permanently deleted immediately, please follow the manual request procedure below.

## How to Request Immediate Account & Data Deletion

Submit a deletion request to our support team:

- **Support Email:** [SUPPORT EMAIL]
- **Privacy Contact:** [PRIVACY EMAIL]
- **External Deletion URL:** [INSERT ACCOUNT DELETION URL]
- **Subject:** Account Deletion Request - [Your Username]

Please include:
1. Your registered username (@username)
2. Your registered email address
3. A statement confirming that you request permanent deletion of your account and personal data

## What Happens Upon Deletion

When an account deletion request is executed:
- **Authentication & Profile:** Your authentication record, profile details, phone number, email, and avatar will be permanently deleted.
- **Posts & Comments:** Your Lost & Found posts and public comments will be removed or scrubbed of any personal attribution.
- **Messages:** Private conversations will be removed from your account.
- **Legal Compliance:** Limited transaction or abuse-prevention records may be held temporarily only where required by applicable laws or security investigations before permanent purging.

---

Retrv
Your way back to what matters.`
  }
};
