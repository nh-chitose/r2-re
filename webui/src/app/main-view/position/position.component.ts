import type { BrokerPosition } from "../../types";
import type { OnInit, OnDestroy } from "@angular/core";
import type { Subscription } from "rxjs/Subscription";

import { Component } from "@angular/core";

import { WsService } from "../../ws.service";

@Component({
  selector: "app-position",
  templateUrl: "./position.component.html",
})
export class PositionComponent implements OnInit, OnDestroy {
  private subscription: Subscription;
  brokerPositions: BrokerPosition[] = [];

  constructor(private readonly wsService: WsService) {}

  ngOnInit() {
    this.wsService.connect();
    this.subscription = this.wsService.position$.subscribe(x => {
      this.brokerPositions = Object.values(x);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
