export interface CodeExample {
  id: string;
  title: string;
  desc: string;
  tag: string;
  code: string;
  stdin?: string;
}

export const EXAMPLES: CodeExample[] = [
  {
    id: 'hello',
    title: 'Hello World',
    desc: '最经典的入门程序',
    tag: '基础',
    code: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    printf("C//RUN 在线运行平台\\n");
    return 0;
}
`,
  },
  {
    id: 'variables',
    title: '变量与运算',
    desc: '基本数据类型与算术',
    tag: '基础',
    code: `#include <stdio.h>

int main(void) {
    int a = 12, b = 5;
    double pi = 3.14159;

    printf("a = %d, b = %d\\n", a, b);
    printf("a + b = %d\\n", a + b);
    printf("a / b = %d (整除)\\n", a / b);
    printf("a %% b = %d (取余)\\n", a % b);
    printf("pi = %.5f\\n", pi);
    return 0;
}
`,
  },
  {
    id: 'fizzbuzz',
    title: '循环 · FizzBuzz',
    desc: 'for 循环与条件分支',
    tag: '控制流',
    code: `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 20; i++) {
        if (i % 15 == 0)      printf("FizzBuzz\\n");
        else if (i % 3 == 0)  printf("Fizz\\n");
        else if (i % 5 == 0)  printf("Buzz\\n");
        else                  printf("%d\\n", i);
    }
    return 0;
}
`,
  },
  {
    id: 'stdin',
    title: '标准输入',
    desc: '使用 scanf 读取输入',
    tag: '输入输出',
    stdin: '42\nTrae\n',
    code: `#include <stdio.h>

int main(void) {
    int age;
    char name[64];

    printf("请输入你的年龄：");
    scanf("%d", &age);

    printf("请输入你的名字：");
    scanf("%63s", name);

    printf("\\n你好，%s！你今年 %d 岁。\\n", name, age);
    return 0;
}
`,
  },
  {
    id: 'pointers',
    title: '指针',
    desc: '指针与解引用',
    tag: '内存',
    code: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main(void) {
    int x = 10, y = 20;
    int *p = &x;

    printf("x = %d, 地址 = %p\\n", x, (void *)p);
    swap(&x, &y);
    printf("swap 后：x = %d, y = %d\\n", x, y);
    return 0;
}
`,
  },
  {
    id: 'struct',
    title: '结构体',
    desc: 'struct 定义与使用',
    tag: '数据结构',
    code: `#include <stdio.h>

typedef struct {
    char name[32];
    int  score;
} Student;

void print_student(const Student *s) {
    printf("%-12s  %3d 分\\n", s->name, s->score);
}

int main(void) {
    Student cls[] = {
        {"Alice", 92},
        {"Bob",   78},
        {"Carol", 88},
    };
    int n = sizeof(cls) / sizeof(cls[0]);

    printf("姓名           成绩\\n");
    printf("--------------------\\n");
    for (int i = 0; i < n; i++) print_student(&cls[i]);
    return 0;
}
`,
  },
  {
    id: 'recursion',
    title: '递归 · 斐波那契',
    desc: '递归函数与记忆化',
    tag: '算法',
    code: `#include <stdio.h>

long fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    printf("斐波那契数列前 15 项：\\n");
    for (int i = 0; i < 15; i++) {
        printf("%ld ", fib(i));
    }
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: 'sort',
    title: '数组排序',
    desc: '冒泡排序算法',
    tag: '算法',
    code: `#include <stdio.h>

void bubble_sort(int a[], int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
}

int main(void) {
    int a[] = {64, 34, 25, 12, 22, 11, 90, 5, 77};
    int n = sizeof(a) / sizeof(a[0]);

    bubble_sort(a, n);

    printf("排序结果：");
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
  },
];
