import type { OnInit, OnDestroy } from "@angular/core";
import type { Subscription } from "rxjs/Subscription";

import { Component } from "@angular/core";

import { WsService } from "../ws.service";

@Component({
  selector: "app-config-form",
  templateUrl: "./config-form.component.html",
})
export class ConfigFormComponent implements OnInit, OnDestroy {
  private subscription: Subscription;
  config: string;

  constructor(private readonly wsService: WsService) {}

  ngOnInit() {
    this.wsService.connect();
    this.subscription = this.wsService.config$.subscribe(config => {
      this.config = JSON.stringify(config, null, 2);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
