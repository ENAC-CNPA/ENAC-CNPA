import { validate } from 'aurelia-deco';

export const requiredProject = <T>(target: T, key: keyof T, descriptor?: PropertyDescriptor): void | any => {
  if (descriptor) descriptor.writable = true;
  validate.addTargetValidation(target, 'requiredProject', key);
  if (descriptor) return descriptor;
}

validate.ValidationRules.customRule(
  `validate:requiredProject`,
  (value: any, obj: any, options: any) => {
    console.log('validation', value);
    return value !== null
      && value !== undefined
      && value !== '';
  },
  `requiredProject`
);
