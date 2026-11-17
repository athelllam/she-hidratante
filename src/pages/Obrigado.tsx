import "./Obrigado.css";

const WHATSAPP_NUMBER = "5531999999999"; // TROQUE pelo WhatsApp oficial da SHE: DDI + DDD + número, somente dígitos.

export default function Obrigado() {
  const whatsappMessage = encodeURIComponent(
    "Olá! Acabei de realizar uma compra na SHE e preciso de ajuda."
  );

  return (
    <main className="she-thankyou-page">
      <section className="she-thankyou-card" aria-labelledby="thankyou-title">
        <header className="she-thankyou-brand" aria-label="SHE Coisa de Mulher">
          <div className="she-thankyou-logo">SHE</div>
          <div className="she-thankyou-brandline">COISA DE MULHER</div>
        </header>

        <div className="she-thankyou-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 id="thankyou-title">Obrigada pela sua compra!</h1>
        <p className="she-thankyou-subtitle">É um prazer ter você com a gente.</p>

        <div className="she-thankyou-divider" />

        <div className="she-thankyou-message">
          <div className="she-thankyou-package" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="m16 3 12 6.5v13L16 29 4 22.5v-13L16 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="m4.5 9.7 11.5 6.5 11.5-6.5M16 16.2V29M10 6.2l12 6.6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Seu pedido está em andamento!</h2>
          <p>
            Assim que seu pedido for enviado, você receberá no e-mail
            cadastrado o link para acompanhar a entrega em tempo real.
          </p>
        </div>

        <aside className="she-thankyou-email">
          <span className="she-thankyou-email-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <strong>Fique de olho no seu e-mail</strong>
            <p>
              Enviaremos o rastreamento assim que sua compra for despachada.
              Confira também a caixa de spam.
            </p>
          </div>
        </aside>

        <a
          className="she-thankyou-whatsapp"
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Precisa de ajuda? Fale com a SHE pelo WhatsApp"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path fill="currentColor" d="M16 3a12.8 12.8 0 0 0-10.9 19.5L3.4 29l6.7-1.7A12.8 12.8 0 1 0 16 3Zm0 23.3c-2 0-3.9-.5-5.6-1.6l-.4-.2-4 1 1.1-3.9-.3-.4A10.5 10.5 0 1 1 16 26.3Zm5.8-7.9c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-2.5-1.5 9.3 9.3 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.7l.5-.5c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.8 5 .8.3 1.4.5 1.9.6.8.2 1.5.2 2 .1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.5Z"/>
          </svg>
          <span>Precisa de ajuda? Fale conosco</span>
        </a>

        <footer className="she-thankyou-footer">
          Com carinho, equipe SHE. <span aria-hidden="true">♡</span>
        </footer>
      </section>
    </main>
  );
}
