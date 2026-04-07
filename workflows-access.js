(function initKreativWorkflowsAccess() {
  const accessKey = 'kreativ_workflows_access';
  const plan = {
    name: 'Kreativ Workflows',
    launchPrice: '$19',
    launchBilling: 'one-time early access',
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

  window.kreativWorkflowsAccess = {
    plan,
    isPaid,
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
