/**
 * DOM操作ユーティリティ
 */

/**
 * テキスト入力フィールドに値を設定（Reactフォーム対応）
 */
export function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // React等のフレームワーク対応のため、ネイティブの値設定を使用
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (element instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // イベントを発火してReact等のstateを更新
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * セレクトボックスの値を設定
 */
export function setSelectValue(element: HTMLSelectElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * ラジオボタンを選択
 */
export function setRadioValue(name: string, value: string): void {
  const radio = document.querySelector<HTMLInputElement>(
    `input[type="radio"][name="${name}"][value="${value}"]`
  );
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * 要素が存在するまで待機
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * 指定したラベルを持つ行から値を取得
 */
export function getValueByLabel(label: string): string {
  const rows = document.querySelectorAll('.MuiGrid-container');
  
  for (const row of rows) {
    const labelEl = row.querySelector('.MuiGrid-grid-xs-3 p');
    const valueEl = row.querySelector('.MuiGrid-grid-xs-9');
    
    if (labelEl?.textContent?.trim() === label && valueEl) {
      // pタグがある場合はその中のテキストを取得
      const pElement = valueEl.querySelector('p');
      if (pElement) {
        return pElement.textContent?.trim() || '';
      }
      return valueEl.textContent?.trim() || '';
    }
  }
  
  return '';
}















