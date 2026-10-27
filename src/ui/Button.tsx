import type { ButtonHTMLAttributes, ReactElement } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'default' | 'ghost';

export function Button({
  variant = 'default',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): ReactElement {
  const classes = [styles.btn, styles[variant], className].filter(Boolean).join(' ');
  return <button type="button" className={classes} {...rest} />;
}
