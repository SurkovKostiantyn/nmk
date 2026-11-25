function populateCloudTechnologiesQuiz() {
  const FORM_ID = '1HuHglUp4c1TsoFrFuz-w1RbQVB4W4XtJccwxW1rwGGU';
  const form = FormApp.openById(FORM_ID);
  form.setIsQuiz(true);

  const questions = [
  {
    "question": "Яка модель хмарних обчислень надає користувачеві віртуальні машини, мережі та сховища даних, залишаючи на ньому управління операційною системою та застосунками?",
    "options": [
      "SaaS (Software as a Service)",
      "PaaS (Platform as a Service)",
      "IaaS (Infrastructure as a Service)",
      "FaaS (Function as a Service)"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Яке хмарне середовище поєднує використання публічної та приватної хмари з можливістю обміну даними та застосунками між ними?",
    "options": [
      "Гібридна хмара",
      "Мультихмара",
      "Приватна хмара",
      "Спільнотна хмара"
    ],
    "correctIndex": 0,
    "points": 4
  },
  {
    "question": "Хто несе відповідальність за безпеку даних користувача, управління правами доступу (IAM) та конфігурацію гостьової ОС у моделі спільної відповідальності для IaaS?",
    "options": [
      "Лише хмарний провайдер",
      "Клієнт (споживач хмарних послуг)",
      "Регуляторні органи",
      "Розробник гіпервізора"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який європейський регламент визначає вимоги щодо захисту персональних даних та приватності користувачів у хмарних сервісах?",
    "options": [
      "ISO 9001",
      "GDPR",
      "PCI DSS",
      "ITIL"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який компонент хмарної мережевої інфраструктури дозволяє створити логічно ізольовану віртуальну приватну мережу для ресурсів у AWS або Azure?",
    "options": [
      "CDN",
      "DNS",
      "VPC / VNet",
      "NAT"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Яке основне призначення CDN (Content Delivery Network) у хмарній інфраструктурі?",
    "options": [
      "Шифрування трафіку між базами даних",
      "Кешування та прискорення доставки контенту через географічно розподілені вузли",
      "Резервне копіювання віртуальних машин",
      "Управління обліковими записами IAM"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який сервіс AWS призначений для запуску та управління віртуальними машинами у моделі IaaS?",
    "options": [
      "Amazon S3",
      "Amazon RDS",
      "Amazon EC2",
      "AWS Lambda"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Який тип хмарного сховища найкраще підходить для зберігання неструктурованих даних (зображень, відео, архівів) із доступом через HTTP/REST API?",
    "options": [
      "Блочне сховище",
      "Об'єктне сховище",
      "Файлове сховище",
      "Оперативна пам'ять"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яке основне завдання виконує система оркестрації контейнерів Kubernetes?",
    "options": [
      "Компіляція вихідного коду застосунків",
      "Автоматизація розгортання, масштабування та управління контейнеризованими застосунками",
      "Налаштування фізичних маршрутизаторів у датацентрі",
      "Створення віртуальних жорстких дисків"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який інструмент Infrastructure as Code (IaC) дозволяє декларативно описувати інфраструктуру для різних хмарних провайдерів?",
    "options": [
      "Docker Compose",
      "Terraform",
      "Prometheus",
      "Jenkins"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яка послідовність базових команд Terraform використовується для ініціалізації провайдерів, перегляду плану змін та створення ресурсів?",
    "options": [
      "apply -> plan -> init",
      "plan -> init -> destroy",
      "init -> plan -> apply",
      "init -> destroy -> apply"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Що означає показник RTO (Recovery Time Objective) у стратегії аварійного відновлення?",
    "options": [
      "Максимальний обсяг даних, який можна втратити за часом",
      "Максимально допустимий час відновлення роботи сервісу після збою",
      "Кількість резервних копій на тиждень",
      "Вартість простою сервера за одну годину"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Чим модель PaaS принципово відрізняється від IaaS?",
    "options": [
      "У PaaS клієнт самостійно керує фізичними серверами",
      "У PaaS провайдер керує ОС і середовищем виконання, а розробник зосереджується на коді та даних",
      "У PaaS неможливо розгортати веб-застосунки",
      "У PaaS користувач отримує лише готовий офісний пакет"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який сервіс є прикладом керованої реляційної бази даних (DBaaS) у Google Cloud?",
    "options": [
      "BigQuery",
      "Cloud SQL",
      "Firestore",
      "Cloud Storage"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Для чого найчастіше використовують сервіси Redis або Memcached у хмарних архітектурах?",
    "options": [
      "Для довготривалого архівного зберігання відео",
      "Для високошвидкісного кешування даних в оперативній пам'яті",
      "Для оркестрації Kubernetes-подів",
      "Для потокової трансляції подій IoT"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яку роль виконує API Gateway у мікросервісній архітектурі?",
    "options": [
      "Замінює реляційну базу даних",
      "Слугує єдиною точкою входу для запитів, забезпечуючи маршрутизацію, автентифікацію та лімітування",
      "Виконує збірку Docker-образів",
      "Керує фізичним охолодженням серверів"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яка стратегія розгортання передбачає підтримку двох ідентичних середовищ із миттєвим перемиканням трафіку на нову версію?",
    "options": [
      "Rolling update",
      "Canary deployment",
      "Blue/Green deployment",
      "Recreate"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Яка стратегія розгортання дозволяє поступово перенаправляти невелику частку трафіку на нову версію застосунку для перевірки її стабільності?",
    "options": [
      "Canary deployment",
      "Big Bang deployment",
      "Shadow IT",
      "Cold standby"
    ],
    "correctIndex": 0,
    "points": 4
  },
  {
    "question": "Що означає поняття мультиорендності (Multi-tenancy) в архітектурі SaaS?",
    "options": [
      "Кожен клієнт купує окремий фізичний датацентр",
      "Один екземпляр застосунку та інфраструктури обслуговує багатьох логічно ізольованих клієнтів",
      "Застосунок працює лише без підключення до інтернету",
      "Користувач має встановлювати програму локально на комп'ютер"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яке з наведених рішень належить до моделі SaaS (Software as a Service)?",
    "options": [
      "AWS EC2",
      "Microsoft 365",
      "Terraform",
      "Azure Kubernetes Service"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Що є ключовою особливістю моделі FaaS (Function as a Service), наприклад AWS Lambda?",
    "options": [
      "Потреба в ручному налаштуванні віртуальних машин",
      "Виконання коду у відповідь на події з оплатою лише за фактичний час виконання",
      "Обов'язкова оренда виділеного сервера на рік",
      "Відсутність підтримки тригерів"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Який сервіс Google Cloud є безсерверним хмарним сховищем даних (Data Warehouse) для аналітики великих обсягів даних?",
    "options": [
      "Google Compute Engine",
      "BigQuery",
      "Cloud Functions",
      "Google App Engine"
    ],
    "correctIndex": 1,
    "points": 4
  },
  {
    "question": "Яка платформа AWS призначена для повного циклу розробки, навчання та розгортання моделей машинного навчання?",
    "options": [
      "Amazon SageMaker",
      "AWS CloudFormation",
      "Amazon CloudWatch",
      "AWS Elastic Beanstalk"
    ],
    "correctIndex": 0,
    "points": 4
  },
  {
    "question": "Яка модель ціноутворення надає найбільші знижки на обчислювальні ресурси, але допускає їх примусове вилучення провайдером?",
    "options": [
      "On-Demand (Pay-as-you-go)",
      "Dedicated Host",
      "Spot / Preemptible instances",
      "Reserved Instances на 3 роки"
    ],
    "correctIndex": 2,
    "points": 4
  },
  {
    "question": "Яка головна мета практики FinOps у хмарних технологіях?",
    "options": [
      "Відмова від використання хмарних сервісів",
      "Оптимізація хмарних витрат і забезпечення фінансової підзвітності через співпрацю інженерних, фінансових і бізнес-команд",
      "Збільшення кількості невикористовуваних віртуальних машин",
      "Автоматичне шифрування всіх баз даних"
    ],
    "correctIndex": 1,
    "points": 4
  }
];

  questions.forEach((q) => {
    const item = form.addMultipleChoiceItem();
    item.setTitle(q.question);
    item.setPoints(q.points);
    item.setRequired(true);
    const choices = q.options.map((opt, idx) =>
      item.createChoice(opt, idx === q.correctIndex)
    );
    item.setChoices(choices);
  });

  Logger.log('Додано запитань: ' + questions.length);
}