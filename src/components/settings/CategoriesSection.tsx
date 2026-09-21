import { useMemo, useState, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { CategoryFormDialog } from './CategoryFormDialog';
import { SubcategoryFormDialog } from './SubcategoryFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import {
  addExpenseSubcategory,
  createExpenseCategory,
  deleteExpenseCategory,
  removeExpenseSubcategory,
  renameExpenseCategory,
  renameExpenseSubcategory,
} from '../../services/categoryService';
import type { CategoryFormValues, SubcategoryFormValues } from '../../schemas/categorySchemas';
import type { ExpenseCategoryRecord, ExpenseSubcategoryRecord } from '../../types/category';

type CategoryDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; category: ExpenseCategoryRecord }
  | null;

type SubcategoryDialogState =
  | { mode: 'create'; category: ExpenseCategoryRecord }
  | { mode: 'edit'; category: ExpenseCategoryRecord; subcategory: ExpenseSubcategoryRecord }
  | null;

interface CategoryRowProps {
  category: ExpenseCategoryRecord;
  onRename: (category: ExpenseCategoryRecord) => void;
  onDelete: (category: ExpenseCategoryRecord) => void;
  onAddSubcategory: (category: ExpenseCategoryRecord) => void;
  onEditSubcategory: (category: ExpenseCategoryRecord, subcategory: ExpenseSubcategoryRecord) => void;
  onDeleteSubcategory: (category: ExpenseCategoryRecord, subcategory: ExpenseSubcategoryRecord) => void;
}

function CategoryRow({
  category,
  onRename,
  onDelete,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Accordion variant="outlined" disableGutters sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flex: 1, minWidth: 0, pr: 1 }}
        >
          <Typography sx={{ fontWeight: 600 }} noWrap>
            {category.name}
          </Typography>
          {category.isDefault && <Chip label="Default" size="small" variant="outlined" />}
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {category.subcategories.length}{' '}
            {category.subcategories.length === 1 ? 'subcategory' : 'subcategories'}
          </Typography>
          <IconButton
            size="small"
            onClick={openMenu}
            aria-label={`Actions for ${category.name}`}
          >
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={(event) => {
                event.stopPropagation();
                closeMenu();
                onRename(category);
              }}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={(event) => {
                event.stopPropagation();
                closeMenu();
                onDelete(category);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {category.subcategories.map((subcategory) => (
            <Chip
              key={subcategory.slug}
              label={subcategory.name}
              size="small"
              onClick={() => onEditSubcategory(category, subcategory)}
              onDelete={() => onDeleteSubcategory(category, subcategory)}
            />
          ))}
          <Chip
            icon={<AddOutlinedIcon />}
            label="Add subcategory"
            size="small"
            variant="outlined"
            onClick={() => onAddSubcategory(category)}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export function CategoriesSection() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { categories, error: loadError, reload } = useExpenseCategories();

  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>(null);
  const [subcategoryDialog, setSubcategoryDialog] = useState<SubcategoryDialogState>(null);

  const existingSlugs = useMemo(() => (categories ?? []).map((c) => c.slug), [categories]);

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    if (!user) return;
    if (categoryDialog?.mode === 'edit') {
      await renameExpenseCategory(categoryDialog.category.id, values.name);
      success('Category updated');
    } else {
      await createExpenseCategory(user.uid, existingSlugs, values.name);
      success('Category added');
    }
    setCategoryDialog(null);
  };

  const handleDeleteCategory = async (category: ExpenseCategoryRecord) => {
    const confirmed = await confirm({
      title: 'Delete category?',
      message: `This deletes "${category.name}" and its subcategories. Existing transactions already recorded under it will keep showing "${category.name}" as plain text, but you won't be able to pick it for new ones.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteExpenseCategory(category.id);
      success('Category deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete category.');
    }
  };

  const handleSubcategorySubmit = async (values: SubcategoryFormValues) => {
    if (!subcategoryDialog) return;
    if (subcategoryDialog.mode === 'edit') {
      await renameExpenseSubcategory(
        subcategoryDialog.category,
        subcategoryDialog.subcategory.slug,
        values.name,
      );
      success('Subcategory updated');
    } else {
      await addExpenseSubcategory(subcategoryDialog.category, values.name);
      success('Subcategory added');
    }
    setSubcategoryDialog(null);
  };

  const handleDeleteSubcategory = async (
    category: ExpenseCategoryRecord,
    subcategory: ExpenseSubcategoryRecord,
  ) => {
    const confirmed = await confirm({
      title: 'Delete subcategory?',
      message: `This deletes "${subcategory.name}" from ${category.name}.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeExpenseSubcategory(category, subcategory.slug);
      success('Subcategory deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete subcategory.');
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title="Expense Categories"
        subheader="Organize what your expenses are grouped under."
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setCategoryDialog({ mode: 'create' })}
          >
            Add Category
          </Button>
        }
      />
      <CardContent>
        {loadError && (
          <ErrorState description={loadError.message} onRetry={reload} />
        )}
        {!loadError && categories === null && <EmptyState title="Loading categories…" />}
        {!loadError && categories !== null && categories.length === 0 && (
          <EmptyState
            icon={<CategoryOutlinedIcon fontSize="inherit" />}
            title="Setting up your categories…"
            description="The default categories are being created — this only takes a moment."
          />
        )}
        {!loadError && categories !== null && categories.length > 0 && (
          <Stack spacing={1}>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onRename={(c) => setCategoryDialog({ mode: 'edit', category: c })}
                onDelete={handleDeleteCategory}
                onAddSubcategory={(c) => setSubcategoryDialog({ mode: 'create', category: c })}
                onEditSubcategory={(c, s) =>
                  setSubcategoryDialog({ mode: 'edit', category: c, subcategory: s })
                }
                onDeleteSubcategory={handleDeleteSubcategory}
              />
            ))}
          </Stack>
        )}
      </CardContent>

      <CategoryFormDialog
        open={categoryDialog !== null}
        mode={categoryDialog?.mode ?? 'create'}
        initialValues={categoryDialog?.mode === 'edit' ? { name: categoryDialog.category.name } : undefined}
        onClose={() => setCategoryDialog(null)}
        onSubmit={handleCategorySubmit}
      />
      <SubcategoryFormDialog
        open={subcategoryDialog !== null}
        mode={subcategoryDialog?.mode ?? 'create'}
        categoryName={subcategoryDialog?.category.name ?? ''}
        initialValues={
          subcategoryDialog?.mode === 'edit' ? { name: subcategoryDialog.subcategory.name } : undefined
        }
        onClose={() => setSubcategoryDialog(null)}
        onSubmit={handleSubcategorySubmit}
      />
    </Card>
  );
}
