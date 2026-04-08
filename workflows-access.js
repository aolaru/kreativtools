(function initKreativWorkflowsAccess() {
  const accessKey = 'kreativ_workflows_access';
  const plan = {
    name: 'Kreativ Workflows',
    launchPrice: '$19',
    launchBilling: 'one-time early access',
    checkoutProvider: 'Lemon Squeezy',
    checkoutUrl: '',
    restoreContact: '/contact/',
    freeTemplateLimit: 1,
    paidTemplateLimit: 8,
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
        link.removeAttribute('target');
        link.removeAttribute('rel');
      }
    });

    document.querySelectorAll('[data-workflows-checkout-status]').forEach((node) => {
      node.textContent = configured
        ? `Checkout runs through ${plan.checkoutProvider}.`
        : `Add your ${plan.checkoutProvider} checkout URL in workflows-access.js to turn this into a live buy flow.`;
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

        const message = `Restore access is not connected yet. If you already purchased ${plan.name}, contact support via ${plan.restoreContact} and we can help you re-enable access on this browser.`;

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
