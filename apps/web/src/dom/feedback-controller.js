export function createFeedbackController({
  elements = {},
  clipboard = null,
  windowTarget = window,
  showToast = () => {}
} = {}) {
  const {
    email,
    emailButton,
    emailLabel,
    xhs,
    xhsButton,
    xhsLabel
  } = elements;

  const bindCopy = (button, input, label, copiedText, resetText, message, fallbackMessage) => {
    button?.addEventListener('click', async () => {
      try {
        await clipboard?.writeText(input.value);
        button.classList.add('copied');
        if (label) label.textContent = copiedText;
        showToast(message, 'success');
        windowTarget.setTimeout(() => {
          button.classList.remove('copied');
          if (label) label.textContent = resetText;
        }, 1600);
      } catch (_) {
        input.focus();
        input.select();
        showToast(fallbackMessage, 'warning');
      }
    });
  };

  const bind = () => {
    bindCopy(emailButton, email, emailLabel, '已复制', '复制邮箱', '反馈邮箱已复制', '无法自动复制，已选中邮箱地址');
    bindCopy(xhsButton, xhs, xhsLabel, '已复制', '复制小红书账号', '小红书账号已复制', '无法自动复制，已选中小红书账号');
  };

  return { bind };
}
