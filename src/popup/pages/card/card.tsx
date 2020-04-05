import React, { useRef, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { format } from 'date-fns';
import { browser } from 'webextension-polyfill-ts';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { usePopupState, bindTrigger, bindMenu } from 'material-ui-popup-state/hooks';
import { GiftCard, CardConfig } from '../../../services/gift-card.types';
import './card.scss';
import { formatDiscount } from '../../../services/merchant';
import { set, get } from '../../../services/storage';
import { resizeToFitPage } from '../../../services/frame';
import { formatCurrency } from '../../../services/currency';
import CodeBox from '../../components/code-box/code-box';

const Card: React.FC<RouteComponentProps & { updatePurchasedGiftCards: (cards: GiftCard[]) => void }> = ({
  location,
  history,
  updatePurchasedGiftCards
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    resizeToFitPage(ref, 80);
  }, [ref]);
  const { card, cardConfig } = location.state as { card: GiftCard; cardConfig: CardConfig };
  // const cardObj = location.state.card as GiftCard;
  // const card = { ...cardObj, discounts: [{ type: 'percentage', amount: 5 }], totalDiscount: 0.05 } as GiftCard;
  const redeemUrl = `${cardConfig.redeemUrl}${card.claimCode}`;
  const popupState = usePopupState({ variant: 'popover', popupId: 'cardActions' });
  const launchNewTab = (url: string): void => {
    browser.tabs.create({ url });
  };
  const launchClaimLink = (): void => {
    const url = cardConfig.defaultClaimCodeType === 'link' ? (card.claimLink as string) : redeemUrl;
    launchNewTab(url);
  };
  const archive = async (): Promise<void> => {
    const cards = await get<GiftCard[]>('purchasedGiftCards');
    const newCards = cards.map(purchasedCard =>
      purchasedCard.invoiceId === card.invoiceId ? { ...purchasedCard, archived: true } : { ...purchasedCard }
    );
    await set<GiftCard[]>('purchasedGiftCards', newCards);
    updatePurchasedGiftCards(newCards);
    history.goBack();
  };
  const handleMenuClick = (item: string): void => {
    switch (item) {
      case 'Edit Balance':
        console.log('edit balance');
        break;
      case 'Archive':
        archive();
        break;
      case 'Help':
        return launchNewTab('https://bitpay.com/request-help');
      default:
        console.log('Unknown Menu Option Selected');
    }
    popupState.close();
  };
  return (
    <div className="card-details">
      <div ref={ref}>
        <button className="card-details__more" type="button" {...bindTrigger(popupState)}>
          <img src="../../assets/icons/dots.svg" alt="More" />
        </button>
        <Menu
          {...bindMenu(popupState)}
          getContentAnchorEl={null}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          className="card-details__more__menu"
          style={{ boxShadow: 'none' }}
        >
          {['Edit Balance', 'Archive', 'Help'].map(option => (
            <MenuItem
              className="card-details__more__menu__item"
              key={option}
              onClick={(): void => handleMenuClick(option)}
            >
              {option}
            </MenuItem>
          ))}
        </Menu>
        <div className="card-details__title">{cardConfig.displayName}</div>
        <div className="card-details__balance">
          <img src={cardConfig.icon} alt={`${cardConfig.displayName} logo`} />
          {formatCurrency(card.amount, card.currency, { hideSymbol: true })}
        </div>
        <div className="card-details__line-items">
          <div className="card-details__line-items__item">
            <div className="card-details__line-items__item__label">Purchased</div>
            <div className="card-details__line-items__item__value">{format(new Date(card.date), 'MMM dd yyyy')}</div>
          </div>
          <div className="card-details__line-items__item">
            <div className="card-details__line-items__item__label">Credit Amount</div>
            <div className="card-details__line-items__item__value">
              {formatCurrency(card.amount, card.currency, { hideSymbol: true })}
            </div>
          </div>
          {card.discounts &&
            card.discounts.map((discount, index) => (
              <div className="card-details__line-items__item" key={index}>
                <div className="card-details__line-items__item__label">
                  {formatDiscount(discount, cardConfig.currency)} Discount
                </div>
                <div className="card-details__line-items__item__value">
                  -{formatCurrency(0.05, card.currency, { hideSymbol: true })}
                </div>
              </div>
            ))}
          {card.totalDiscount ? (
            <>
              <div className="card-details__line-items__item">
                <div className="card-details__line-items__item__label">Total Cost</div>
                <div className="card-details__line-items__item__value">
                  {formatCurrency(card.amount - (card.totalDiscount || 0.05), card.currency, { hideSymbol: true })}
                </div>
              </div>
            </>
          ) : null}
          {card.invoice ? (
            <>
              <div className="card-details__line-items__item">
                <div className="card-details__line-items__item__label">Amount Paid</div>
                <div className="card-details__line-items__item__value crypto-amount">
                  {card.invoice.displayAmountPaid} {card.invoice.transactionCurrency}
                </div>
              </div>
            </>
          ) : null}
        </div>
        {cardConfig.defaultClaimCodeType !== 'link' ? (
          <>
            <CodeBox label="Claim Code" code={card.claimCode} />
            {card.pin ? <CodeBox label="Pin" code={card.pin} /> : null}
          </>
        ) : null}

        {cardConfig.redeemUrl || cardConfig.defaultClaimCodeType === 'link' ? (
          <button
            className="action-button"
            type="button"
            onClick={(): void => launchClaimLink()}
            style={{ marginBottom: '-10px' }}
          >
            Redeem Now
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default Card;
