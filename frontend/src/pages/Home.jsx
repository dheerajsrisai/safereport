import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Report a crime without giving your name.</h1>
        <p className="lead">
          Describe what happened, attach evidence if you have it, and get a private tracking code.
          Officers can reply to you through that code. No account, no email, no phone number.
        </p>
        <div className="row">
          <Link className="btn big" to="/report">Report a crime</Link>
          <Link className="btn ghost big" to="/track">Track an existing report</Link>
        </div>
      </section>

      <section className="split">
        <div>
          <h2>How your identity stays protected</h2>
          <dl className="facts">
            <dt>We never ask who you are</dt>
            <dd>There is no sign-up. A report contains only what you choose to write in it.</dd>
            <dt>Your tracking code is the only link to your report</dt>
            <dd>Only a one-way hash of the code is stored, so even our administrators cannot look you up.</dd>
            <dt>Photos are scrubbed</dt>
            <dd>Take photos and videos right in the app. GPS location, camera model and timestamps are removed from photos before they are saved.</dd>
            <dt>No IP address is saved with your report</dt>
            <dd>Server access logs are switched off. Videos and PDFs keep their metadata, so only attach those if you are comfortable.</dd>
          </dl>
        </div>
        <div>
          <h2>What happens next</h2>
          <ol className="steps">
            <li><b>You submit.</b> Fill in the form and attach evidence.</li>
            <li><b>You save your code.</b> It is shown once and cannot be recovered.</li>
            <li><b>Officers review.</b> You can follow the status and answer their questions on the Track page.</li>
          </ol>
        </div>
      </section>
    </>
  );
}
