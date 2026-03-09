# Настройка на GitHub

## 1. Създай ново празно хранилище в GitHub

1. Отиди на [github.com](https://github.com)
2. Влез в акаунта си
3. Натисни **+** → **New repository**
4. Въведи име на хранилището
5. **Не** избирай README, .gitignore или лиценз
6. Натисни **Create repository**

## 2. Свържи локалния проект с GitHub

Отвори терминала в папката на проекта и изпълни:

```bash
git init
git remote add origin https://github.com/ТВОЕТО_ПОТРЕБИТЕЛСКО_ИМЕ/ИМЕ_НА_ХРАНИЛИЩЕТО.git
```

(Замени `ТВОЕТО_ПОТРЕБИТЕЛСКО_ИМЕ` и `ИМЕ_НА_ХРАНИЛИЩЕТО` с реалните стойности от GitHub)

## 3. Направи първия commit

```bash
git add .
git commit -m "Първи commit"
```

## 4. Изпрати проекта в GitHub

```bash
git branch -M main
git push -u origin main
```
