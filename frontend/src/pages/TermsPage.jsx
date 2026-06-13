import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, AlertCircle, Gavel, CreditCard } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Helmet>
        <title>Terms of Service | ChurchNavigator</title>
        <meta name="description" content="ChurchNavigator Terms of Service - User responsibilities, listing guidelines, and service terms" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="mb-2">
                By accessing or using ChurchNavigator.com ("the Service"), operated by ChurchNavigator Ltd ("we", "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>
              <p className="font-semibold">These Terms constitute a legally binding agreement between you and ChurchNavigator Ltd under the laws of England and Wales.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="mb-2">ChurchNavigator provides:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A comprehensive directory of churches across the United Kingdom</li>
                <li>Event discovery and registration services</li>
                <li>Church visitor check-in and engagement tracking tools</li>
                <li>Worship service planning and resource management tools</li>
                <li>AI-assisted content generation for church descriptions, sermons, and promotional materials</li>
                <li>Job listings for worship leaders, media team members, and other church positions</li>
                <li>Donation processing and Gift Aid declaration services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="mb-2"><strong>3.1 Account Registration:</strong> To access certain features, you must create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your password and account</li>
                <li>Promptly update your account information if it changes</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorised use of your account</li>
              </ul>
              <p className="mb-2"><strong>3.2 Account Types:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Visitor Accounts:</strong> Free accounts for browsing churches and events</li>
                <li><strong>Church Admin Accounts:</strong> Manage church listings, visitor analytics, and service planning (subscription required for premium features)</li>
                <li><strong>Professional Accounts:</strong> For worship leaders and media team members to create job profiles (free with optional premium upgrades)</li>
              </ul>
              <p className="mt-2"><strong>3.3 Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or misuse the Service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Church Listings and Content</h2>
              <p className="mb-2"><strong>4.1 Listing Accuracy:</strong> Church administrators are responsible for ensuring that:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Church information (address, service times, contact details) is accurate and current</li>
                <li>Photos and media are owned by the church or properly licensed</li>
                <li>Descriptions accurately represent the church's theology, denomination, and practices</li>
                <li>Event information is truthful and up-to-date</li>
              </ul>
              <p className="mb-2"><strong>4.2 Content Ownership:</strong> You retain ownership of content you submit (photos, descriptions, sermon notes), but grant us a worldwide, royalty-free licence to display, distribute, and promote this content on ChurchNavigator.</p>
              <p className="mb-2"><strong>4.3 Prohibited Content:</strong> You may not post content that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violates UK law or promotes illegal activity</li>
                <li>Is hateful, discriminatory, or promotes violence</li>
                <li>Infringes intellectual property rights</li>
                <li>Contains malware, spam, or deceptive links</li>
                <li>Impersonates another person or organisation</li>
                <li>Is sexually explicit or inappropriate for a faith-based platform</li>
              </ul>
            </section>

            <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                5. AI-Generated Content Disclaimers
              </h2>
              <p className="mb-2"><strong>5.1 AI-Assisted Features:</strong> ChurchNavigator uses artificial intelligence (powered by Anthropic's Claude) to assist with:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Generating church descriptions and promotional copy</li>
                <li>Analysing sermon transcripts and suggesting themes</li>
                <li>Creating event descriptions and social media posts</li>
                <li>Providing visitor engagement insights and recommendations</li>
              </ul>
              <p className="mb-2"><strong>5.2 Content Review Required:</strong> AI-generated content is provided as a starting point. You must:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Review all AI-generated content before publishing</li>
                <li>Ensure theological accuracy and alignment with your church's beliefs</li>
                <li>Edit or reject content that does not meet your standards</li>
                <li>Accept responsibility for any AI-generated content you choose to publish</li>
              </ul>
              <p className="font-semibold">5.3 No Theological Guarantee: While our AI is trained to respect Christian faith traditions, we do not guarantee theological accuracy or denominational compatibility of AI-generated content. Always verify content against your church's doctrine.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-purple-600" />
                6. Payments and Subscriptions
              </h2>
              <p className="mb-2"><strong>6.1 Subscription Plans:</strong> Premium features require a paid subscription. Current pricing is available at churchnavigator.com/pricing.</p>
              <p className="mb-2"><strong>6.2 Billing:</strong></p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Subscriptions are billed monthly or annually in advance</li>
                <li>Payment is processed securely via our third-party payment provider</li>
                <li>You authorise us to charge your payment method on each billing cycle</li>
                <li>Prices may change with 30 days' notice to existing subscribers</li>
              </ul>
              <p className="mb-2"><strong>6.3 Cancellation and Refunds:</strong></p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>You may cancel your subscription at any time from your account settings</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>No refunds are provided for partial subscription periods</li>
                <li>We may offer pro-rated refunds at our discretion for service issues</li>
              </ul>
              <p className="mb-2"><strong>6.4 Donations:</strong> Donations to churches via ChurchNavigator are processed securely. We are not responsible for how churches use donated funds. Gift Aid declarations are submitted to HMRC on behalf of registered charities.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Visitor Check-In System</h2>
              <p className="mb-2"><strong>7.1 QR Code Usage:</strong> Churches may generate QR codes for visitor check-ins. Visitors voluntarily provide their contact details or check in anonymously.</p>
              <p className="mb-2"><strong>7.2 Data Processing:</strong> Visitor data is processed according to our Privacy Policy. Churches must inform visitors about data collection and obtain necessary consents.</p>
              <p><strong>7.3 Church Responsibility:</strong> Churches are data controllers for visitor information and must comply with UK GDPR. We provide tools but do not control how churches use visitor data.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="mb-2"><strong>8.1 Our IP:</strong> ChurchNavigator's platform, design, code, logos, and branding are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or reverse-engineer our Service.</p>
              <p className="mb-2"><strong>8.2 Your IP:</strong> You retain ownership of content you create. By submitting content, you grant us a licence to use it on our platform.</p>
              <p><strong>8.3 DMCA:</strong> If you believe content on ChurchNavigator infringes your copyright, contact us at dmca@churchnavigator.com with details.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Gavel className="w-6 h-6 text-purple-600" />
                9. Limitation of Liability
              </h2>
              <p className="mb-2"><strong>9.1 Service "As Is":</strong> ChurchNavigator is provided "as is" without warranties of any kind. We do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Uninterrupted or error-free service</li>
                <li>Accuracy of church information or user-generated content</li>
                <li>Compatibility with all devices or browsers</li>
                <li>Security against all threats or data breaches</li>
              </ul>
              <p className="mb-2"><strong>9.2 Liability Cap:</strong> To the maximum extent permitted by UK law, our total liability for any claims arising from your use of ChurchNavigator shall not exceed the amount you paid us in the 12 months before the claim (or £100 if you haven't paid anything).</p>
              <p className="mb-2"><strong>9.3 Excluded Damages:</strong> We are not liable for indirect, incidental, consequential, or punitive damages including lost profits, data loss, or business interruption.</p>
              <p className="font-semibold">9.4 Exceptions: Nothing in these Terms excludes liability for death/personal injury caused by negligence, fraud, or other liabilities that cannot be excluded under UK law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
              <p>You agree to indemnify and hold harmless ChurchNavigator Ltd, its directors, employees, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights (including intellectual property or privacy rights)</li>
                <li>Content you submit to the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
              <p className="mb-2"><strong>11.1 Governing Law:</strong> These Terms are governed by the laws of England and Wales.</p>
              <p className="mb-2"><strong>11.2 Jurisdiction:</strong> Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
              <p><strong>11.3 Informal Resolution:</strong> Before initiating legal action, we encourage you to contact us at legal@churchnavigator.com to resolve disputes informally.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Modifications to Terms</h2>
              <p className="mb-2">We may update these Terms from time to time. Significant changes will be notified via:</p>
              <ul className="list-disc pl-6 space-y-1 mb-2">
                <li>Email to registered users</li>
                <li>Prominent notice on the website</li>
                <li>In-app notification</li>
              </ul>
              <p>Continued use of the Service after changes constitutes acceptance. If you do not agree to updated Terms, you must stop using the Service and may close your account.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
              <p className="mb-2">We may terminate or suspend your access immediately, without notice, for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Harm to other users or the platform</li>
                <li>Extended inactivity (3+ years)</li>
              </ul>
              <p className="mt-2">Upon termination, your right to use the Service ceases immediately. Data retention follows our Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Miscellaneous</h2>
              <p className="mb-2"><strong>14.1 Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and ChurchNavigator.</p>
              <p className="mb-2"><strong>14.2 Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect.</p>
              <p className="mb-2"><strong>14.3 Waiver:</strong> Failure to enforce any provision does not waive our right to enforce it later.</p>
              <p><strong>14.4 Assignment:</strong> You may not assign these Terms without our consent. We may assign our rights and obligations to a successor entity.</p>
            </section>

            <section className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="mb-2"><strong>ChurchNavigator Ltd</strong></p>
              <p className="mb-2">Email: <a href="mailto:legal@churchnavigator.com" className="text-purple-600 hover:text-purple-700">legal@churchnavigator.com</a></p>
              <p className="mb-2">Support: <a href="mailto:support@churchnavigator.com" className="text-purple-600 hover:text-purple-700">support@churchnavigator.com</a></p>
              <p className="mt-4 text-sm text-gray-600">For privacy-related queries, see our <a href="/privacy" className="text-purple-600 hover:text-purple-700">Privacy Policy</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;