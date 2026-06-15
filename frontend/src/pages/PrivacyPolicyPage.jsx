import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, Database, Cookie, Download } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Helmet>
        <title>Privacy Policy | ChurchNavigator</title>
        <meta name="description" content="ChurchNavigator Privacy Policy - How we collect, use and protect your data in compliance with UK GDPR" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-600" />
                1. What Data We Collect
              </h2>
              <p className="mb-4">
                ChurchNavigator Ltd ("we", "us", "our") operates ChurchNavigator.com, the UK's leading church directory. We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018.
              </p>
              <p className="font-semibold mb-2">We collect and process the following types of data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Church Listings Data:</strong> Church names, addresses, service times, contact details, descriptions, and photos submitted by church administrators</li>
                <li><strong>User Account Information:</strong> Email addresses, names, and encrypted passwords for registered users (church admins, worship leaders, media team members)</li>
                <li><strong>Visitor Check-In Data:</strong> When visitors check in to a church using our QR code system, we record the visitor's chosen identifier (anonymous or named), check-in timestamp, and church visited. This data helps churches understand visitor patterns and engagement.</li>
                <li><strong>Visitor Journey Analytics:</strong> Aggregated, anonymised data about visitor return patterns, churn analysis, and engagement metrics to help churches improve their outreach strategies</li>
                <li><strong>Event Information:</strong> Event titles, descriptions, dates, locations, and registration data when you create or register for church events</li>
                <li><strong>Service Planner Data:</strong> Service orders, sermon notes, hymn selections, and other worship planning materials created using our planner tools</li>
                <li><strong>AI Interaction Logs:</strong> When you use AI-powered features (church description generation, sermon analysis, promotional content creation), we log prompts and generated content to improve service quality. These logs are processed via Anthropic's Claude API.</li>
                <li><strong>Donation Records:</strong> Payment details, donation amounts, and Gift Aid declarations when you contribute to churches through our platform (processed securely via our payment provider)</li>
                <li><strong>Technical Data:</strong> IP addresses, browser types, device information, and page views collected via cookies and analytics tools</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Data</h2>
              <p className="mb-2">We use your personal data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Delivery:</strong> To operate the church directory, manage listings, enable visitor check-ins, and provide event registration</li>
                <li><strong>Church Analytics:</strong> To provide churches with insights about visitor patterns, engagement trends, and outreach effectiveness (all analytics are presented in aggregated, anonymised form)</li>
                <li><strong>AI-Assisted Features:</strong> To generate church descriptions, analyse sermon content, create promotional materials, and suggest improvements using AI technology</li>
                <li><strong>Communication:</strong> To send service updates, event notifications, and important announcements (you can opt out at any time)</li>
                <li><strong>Payment Processing:</strong> To process donations and subscriptions securely</li>
                <li><strong>Legal Compliance:</strong> To comply with UK legal obligations and prevent fraud</li>
                <li><strong>Service Improvement:</strong> To analyse usage patterns and improve our platform (using anonymised data)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Legal Basis for Processing</h2>
              <p className="mb-2">Under UK GDPR, we process your data based on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Consent:</strong> For visitor check-ins, AI interactions, marketing communications, and analytics cookies</li>
                <li><strong>Contract Performance:</strong> For user accounts, event registrations, and service delivery</li>
                <li><strong>Legitimate Interests:</strong> For security, fraud prevention, and service improvement (where balanced against your rights)</li>
                <li><strong>Legal Obligation:</strong> For compliance with UK laws including Gift Aid requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Data Sharing</h2>
              <p className="mb-2">We share data with trusted third parties only as necessary:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Anthropic (Claude API):</strong> AI prompts and generated content are processed via Anthropic's API. See Anthropic's privacy policy at anthropic.com/privacy</li>
                <li><strong>Payment Processors:</strong> Payment card details are handled directly by our PCI-compliant payment provider (we never store full card numbers)</li>
                <li><strong>Email Service Provider:</strong> Email addresses and communication preferences for sending transactional and marketing emails</li>
                <li><strong>Cloud Hosting:</strong> MongoDB Atlas (database hosting), Railway (application hosting), ImageKit (image CDN)</li>
                <li><strong>Analytics Tools:</strong> Anonymised usage data for understanding site traffic (only with your cookie consent)</li>
              </ul>
              <p className="mt-2">We do not sell your personal data to third parties. All third-party processors are bound by data protection agreements.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Cookie className="w-6 h-6 text-purple-600" />
                5. Cookies and Tracking
              </h2>
              <p className="mb-2">We use the following types of cookies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for login, security, and core functionality (cannot be disabled)</li>
                <li><strong>Analytics Cookies:</strong> Track page views and usage patterns to improve our service (requires your consent)</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and cookie consent choices</li>
              </ul>
              <p className="mt-2">You can manage your cookie preferences at any time using our cookie banner or your browser settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>User Accounts:</strong> Retained until you request deletion or after 3 years of inactivity</li>
                <li><strong>Visitor Check-Ins:</strong> Retained for 2 years to enable meaningful trend analysis</li>
                <li><strong>AI Interaction Logs:</strong> Retained for 6 months for service improvement, then anonymised</li>
                <li><strong>Donation Records:</strong> Retained for 6 years to comply with UK tax and Gift Aid requirements</li>
                <li><strong>Service Planner Data:</strong> Retained until you delete it or close your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="mb-2">Under UK GDPR, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data in certain circumstances</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or for marketing purposes</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
              </ul>
              <p className="mt-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-600" />
                <span>To exercise these rights, use our <Link to="/account/data-export" className="text-purple-600 hover:text-purple-700 font-semibold">Data Export Tool</Link> or contact us at the details below.</span>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-purple-600" />
                8. Data Security
              </h2>
              <p>We implement industry-standard security measures including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Encryption of data in transit (HTTPS/TLS) and at rest</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication for all administrative functions</li>
                <li>MongoDB Atlas with built-in backup and disaster recovery</li>
              </ul>
              <p className="mt-2">While we take all reasonable precautions, no internet transmission is 100% secure. We cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p>Your data is primarily stored in UK/EU data centres (MongoDB Atlas EU region). When using third-party services (e.g., Anthropic AI), data may be transferred to countries outside the UK/EEA. We ensure appropriate safeguards are in place (standard contractual clauses, adequacy decisions) for all international transfers.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p>ChurchNavigator is not intended for users under 13. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p>We may update this privacy policy from time to time. Significant changes will be notified via email or a prominent site notice. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                12. Contact Us
              </h2>
              <p className="mb-2"><strong>Data Controller:</strong> ChurchNavigator Ltd</p>
              <p className="mb-2"><strong>Email:</strong> <a href="mailto:privacy@churchnavigator.com" className="text-purple-600 hover:text-purple-700">privacy@churchnavigator.com</a></p>
              <p className="mb-2"><strong>Data Protection Officer:</strong> <a href="mailto:dpo@churchnavigator.com" className="text-purple-600 hover:text-purple-700">dpo@churchnavigator.com</a></p>
              <p className="mt-4"><strong>Supervisory Authority:</strong> You have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700">ico.org.uk</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;