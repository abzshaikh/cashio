import { useState, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { formatDate } from '../../utils/formatDate';
import type { Receipt } from '../../types/receipt';
import type { Transaction } from '../../types/transaction';

interface ReceiptCardProps {
  receipt: Receipt;
  /** The transaction this receipt is linked to, if any — resolved by the
   * page (which already subscribes to the full ledger) rather than this
   * card doing its own lookup. */
  linkedTransaction: Transaction | null;
  currency?: string;
  onEdit: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
}

export function ReceiptCard({ receipt, linkedTransaction, currency, onEdit, onDelete }: ReceiptCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isImage = receipt.fileType.startsWith('image/');

  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isImage ? (
        <CardMedia
          component="img"
          image={receipt.downloadUrl}
          alt={`Receipt from ${receipt.merchant}`}
          sx={{ height: 140, objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
        </Box>
      )}
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {receipt.merchant}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(receipt.date)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={openMenu} aria-label={`Actions for receipt from ${receipt.merchant}`}>
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                onEdit(receipt);
              }}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                onDelete(receipt);
              }}
            >
              <ListItemIcon>
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Typography variant="h6" component="p" sx={{ mt: 1, fontWeight: 700 }}>
          <CurrencyText amount={receipt.amount} currency={currency} />
        </Typography>

        {linkedTransaction && (
          <Chip
            icon={<LinkOutlinedIcon fontSize="small" />}
            label={linkedTransaction.description || linkedTransaction.merchant || linkedTransaction.type}
            size="small"
            variant="outlined"
            sx={{ mt: 1, maxWidth: '100%' }}
          />
        )}

        {receipt.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {receipt.notes}
          </Typography>
        )}

        <Box sx={{ mt: 1.5 }}>
          <IconButton
            size="small"
            component="a"
            href={receipt.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View receipt from ${receipt.merchant}`}
          >
            <OpenInNewOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
