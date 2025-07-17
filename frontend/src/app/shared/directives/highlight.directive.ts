import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appHighlight]'
})
export class HighlightDirective implements OnChanges {
  @Input() appHighlight: string = '';
  @Input() searchTerm: string = '';

  constructor(private el: ElementRef) {}

  ngOnChanges(): void {
    if (this.searchTerm && this.appHighlight) {
      this.highlight();
    } else {
      this.clearHighlight();
    }
  }

  private highlight(): void {
    const text = this.appHighlight;
    const term = this.searchTerm;
    
    if (!term) {
      this.el.nativeElement.innerHTML = text;
      return;
    }

    const regex = new RegExp(`(${term})`, 'gi');
    const highlighted = text.replace(regex, '<mark>$1</mark>');
    this.el.nativeElement.innerHTML = highlighted;
  }

  private clearHighlight(): void {
    this.el.nativeElement.innerHTML = this.appHighlight;
  }
}