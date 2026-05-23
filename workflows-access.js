(function initKreativWorkflowsAccess() {
  const accessKey = 'kreativ_workflows_access';
  const configuredPlan = window.KREATIV_PAYMENTS && window.KREATIV_PAYMENTS.workflows
    ? window.KREATIV_PAYMENTS.workflows
    : {};

  const plan = {
    name: 'Kreativ Workflows',
    launchPrice: '$19',
    launchBilling: 'one-time access',
    checkoutProvider: 'PayPal',
    checkoutUrl: '',
    restoreContact: '/contact/',
    successUrl: '/workflows/success/',
    freeTemplateLimit: 1,
    paidTemplateLimit: 8,
    ...configuredPlan,
  };

  const readAccess = () => {
    try {
      const raw = window.localStorage.getItem(accessKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const isPaid = () => Boolean(readAccess().paid);
  const hasCheckout = () => /^https?:\/\//.test(plan.checkoutUrl);

  const applyPageAccess = () => {
    const paid = isPaid();
    document.querySelectorAll('[data-workflows-paid-content]').forEach((node) => {
      node.hidden = !paid;
    });
    document.querySelectorAll('[data-workflows-locked-content]').forEach((node) => {
      node.hidden = paid;
    });
    document.body.dataset.workflowsAccess = paid ? 'paid' : 'locked';
  };

  const wireCheckoutLinks = () => {
    const configured = hasCheckout();
    document.querySelectorAll('[data-workflows-checkout-link]').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      if (configured) {
        link.href = plan.checkoutUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (link.dataset.checkoutLabel) link.textContent = link.dataset.checkoutLabel;
      } else {
        if (link.dataset.fallbackHref) {
          link.href = link.dataset.fallbackHref;
        }
        if (link.dataset.fallbackLabel) {
          link.textContent = link.dataset.fallbackLabel;
        }
        link.removeAttribute('target');
        link.removeAttribute('rel');
      }
    });

    document.querySelectorAll('[data-workflows-checkout-status]').forEach((node) => {
      node.textContent = configured
        ? `Checkout opens in ${plan.checkoutProvider}. Browser activation is manual after purchase.`
        : `Paid access is handled manually right now. Use the contact page for early access or restore help.`;
    });
  };

  const wireRestoreAccess = () => {
    document.querySelectorAll('[data-workflows-restore-access]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;

      button.addEventListener('click', () => {
        const paid = isPaid();
        const scope = button.dataset.workflowsRestoreScope || plan.name;
        const statusTarget = button.dataset.workflowsRestoreStatus;
        const statusNode = statusTarget ? document.getElementById(statusTarget) : null;

        if (paid) {
          if (statusNode) statusNode.textContent = `${scope} is already unlocked on this browser.`;
          applyPageAccess();
          return;
        }

        const message = `Restore access is manual right now. If you already purchased ${plan.name}, contact support via ${plan.restoreContact} and include the PayPal receipt or transaction ID if available.`;

        if (statusNode) {
          statusNode.textContent = message;
        } else {
          window.alert(message);
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyPageAccess();
      wireCheckoutLinks();
      wireRestoreAccess();
    }, { once: true });
  } else {
    applyPageAccess();
    wireCheckoutLinks();
    wireRestoreAccess();
  }

  window.kreativWorkflowsAccess = {
    plan,
    isPaid,
    hasCheckout,
    setPaidAccess(paid) {
      window.localStorage.setItem(accessKey, JSON.stringify({ paid: Boolean(paid) }));
      applyPageAccess();
      wireCheckoutLinks();
    },
    templateLimit() {
      return isPaid() ? plan.paidTemplateLimit : plan.freeTemplateLimit;
    },
    canSaveAnotherTemplate(existingCount, isReplacing) {
      return isPaid() || isReplacing || existingCount < plan.freeTemplateLimit;
    },
    upgradeMessage() {
      return `Free includes ${plan.freeTemplateLimit} saved template per workflow. Unlock ${plan.name} for up to ${plan.paidTemplateLimit} named templates.`;
    },
  };
})();
